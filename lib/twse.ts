/**
 * 證交所 (TWSE) 公開資料存取層。
 *
 * 注意:這些 API 只能在 server 端呼叫(Next.js API route),
 * 因為證交所有 CORS 限制,瀏覽器直接打會被擋。
 *
 * 主要端點(皆為公開、免金鑰):
 *  - 個股日成交資訊  STOCK_DAY  (一次回傳「一個月」資料)
 *  - 三大法人買賣超  T86       (一次回傳「某天、全部個股」)
 *  - 本益比/殖利率   BWIBBU_d   (一次回傳「某天、全部個股」)
 *  - 即時報價        mis API
 */

const TWSE_BASE = "https://www.twse.com.tw/rwd/zh";
const MIS_BASE = "https://mis.twse.com.tw/stock/api";

// 簡易記憶體快取(server 端):降低對證交所的請求頻率,避免被限流。
type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function cachedFetchJson(url: string, ttlMs: number): Promise<any> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value;

  const res = await fetch(url, {
    headers: {
      // 帶上 UA,避免部分端點回傳異常
      "User-Agent":
        "Mozilla/5.0 (compatible; TaiwanStockDashboard/0.1; +https://github.com)",
      Accept: "application/json, text/plain, */*",
    },
    // Next.js fetch 快取交給我們自己的記憶體快取控制
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`TWSE 請求失敗 ${res.status}: ${url}`);
  }
  const json = await res.json();
  cache.set(url, { value: json, expires: Date.now() + ttlMs });
  return json;
}

/** 民國/西元日期工具 */
function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 把證交所的數字字串("1,234.5"、"--")轉成 number|null */
function num(s: string | undefined): number | null {
  if (s == null) return null;
  const cleaned = s.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "--" || cleaned === "X0.00") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export type Candle = {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 成交股數(張 = volume/1000)
};

/**
 * 取得個股日 K 線。STOCK_DAY 一次只回傳「指定月份」資料,
 * 所以要往回抓 `months` 個月再合併。
 */
export async function getDailyCandles(
  stockNo: string,
  months = 6
): Promise<Candle[]> {
  const now = new Date();
  const requests: Promise<any>[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const url = `${TWSE_BASE}/afterTrading/STOCK_DAY?date=${ymd(
      d
    )}&stockNo=${stockNo}&response=json`;
    // 當月資料 TTL 短(5 分鐘),歷史月份 TTL 長(1 天)
    const ttl = i === 0 ? 5 * 60_000 : 24 * 60 * 60_000;
    requests.push(cachedFetchJson(url, ttl).catch(() => null));
  }

  const results = await Promise.all(requests);
  const candles: Candle[] = [];
  for (const json of results) {
    if (!json || json.stat !== "OK" || !Array.isArray(json.data)) continue;
    for (const row of json.data) {
      // 欄位: 日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數
      const dateRaw = row[0] as string; // "115/01/02" (民國年)
      const [yRoc, mm, dd] = dateRaw.split("/");
      const year = Number(yRoc) + 1911;
      const date = `${year}-${mm}-${dd}`;
      const open = num(row[3]);
      const high = num(row[4]);
      const low = num(row[5]);
      const close = num(row[6]);
      const volume = num(row[1]);
      if (open == null || high == null || low == null || close == null)
        continue;
      candles.push({
        date,
        open,
        high,
        low,
        close,
        volume: volume ?? 0,
      });
    }
  }
  // 去重 + 依日期排序
  const seen = new Set<string>();
  return candles
    .filter((c) => (seen.has(c.date) ? false : seen.add(c.date)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type InstitutionalRow = {
  date: string;
  foreign: number; // 外資買賣超(股)
  trust: number; // 投信
  dealer: number; // 自營商
  total: number; // 三大法人合計
};

/**
 * 三大法人對「單一個股」的買賣超。T86 一次回傳某天全部個股,
 * 所以要往回逐日抓近 `days` 個交易日並過濾出該檔。
 */
export async function getInstitutional(
  stockNo: string,
  days = 20
): Promise<InstitutionalRow[]> {
  const now = new Date();
  const requests: { date: string; p: Promise<any> }[] = [];
  // 抓回推 days*2 個自然日,以涵蓋假日(再取前 days 筆有資料的)
  for (let i = 0; i < days * 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const url = `${TWSE_BASE}/fund/T86?date=${ymd(
      d
    )}&selectType=ALL&response=json`;
    requests.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`,
      p: cachedFetchJson(url, 12 * 60 * 60_000).catch(() => null),
    });
  }

  const rows: InstitutionalRow[] = [];
  const results = await Promise.all(requests.map((r) => r.p));
  results.forEach((json, idx) => {
    if (!json || json.stat !== "OK" || !Array.isArray(json.data)) return;
    const fields: string[] = json.fields || [];
    const idxCode = fields.findIndex((f) => f.includes("證券代號"));
    const idxForeign = fields.findIndex((f) => f.includes("外陸資買賣超") || f === "外資買賣超股數");
    const idxTrust = fields.findIndex((f) => f.includes("投信買賣超"));
    const idxDealer = fields.findIndex((f) => f.includes("自營商買賣超股數"));
    const idxTotal = fields.findIndex((f) => f.includes("三大法人買賣超股數"));
    const match = json.data.find(
      (r: string[]) => (r[idxCode] || "").trim() === stockNo
    );
    if (!match) return;
    rows.push({
      date: requests[idx].date,
      foreign: num(match[idxForeign]) ?? 0,
      trust: num(match[idxTrust]) ?? 0,
      dealer: num(match[idxDealer]) ?? 0,
      total: num(match[idxTotal]) ?? 0,
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}

export type Valuation = {
  date: string;
  pe: number | null; // 本益比
  dividendYield: number | null; // 殖利率(%)
  pbr: number | null; // 股價淨值比
};

/** 本益比 / 殖利率 / 股價淨值比(基本面快照),取最近有資料的交易日 */
export async function getValuation(stockNo: string): Promise<Valuation | null> {
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const url = `${TWSE_BASE}/afterTrading/BWIBBU_d?date=${ymd(
      d
    )}&selectType=ALL&response=json`;
    const json = await cachedFetchJson(url, 12 * 60 * 60_000).catch(() => null);
    if (!json || json.stat !== "OK" || !Array.isArray(json.data)) continue;
    const match = json.data.find(
      (r: string[]) => (r[0] || "").trim() === stockNo
    );
    if (!match) continue;
    // 欄位: 證券代號, 證券名稱, 殖利率(%), 股利年度, 本益比, 股價淨值比, 財報年/季
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`,
      dividendYield: num(match[2]),
      pe: num(match[4]),
      pbr: num(match[5]),
    };
  }
  return null;
}

export type RealtimeQuote = {
  stockNo: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  volume: number | null;
  time: string;
};

/** 即時報價(盤中)。盤後此端點可能回傳前一日資料。 */
export async function getRealtime(
  stockNo: string
): Promise<RealtimeQuote | null> {
  // 先試上市(tse),再試上櫃(otc)
  for (const ex of ["tse", "otc"]) {
    const url = `${MIS_BASE}/getStockInfo.jsp?ex_ch=${ex}_${stockNo}.tw&json=1&delay=0`;
    const json = await cachedFetchJson(url, 10_000).catch(() => null);
    const info = json?.msgArray?.[0];
    if (!info) continue;
    const price = num(info.z) ?? num(info.y); // z=成交價, y=昨收
    const prevClose = num(info.y);
    const change =
      price != null && prevClose != null ? +(price - prevClose).toFixed(2) : null;
    return {
      stockNo,
      name: info.n || stockNo,
      price,
      prevClose,
      change,
      changePercent:
        change != null && prevClose
          ? +((change / prevClose) * 100).toFixed(2)
          : null,
      open: num(info.o),
      high: num(info.h),
      low: num(info.l),
      volume: num(info.v),
      time: `${info.d || ""} ${info.t || ""}`.trim(),
    };
  }
  return null;
}
