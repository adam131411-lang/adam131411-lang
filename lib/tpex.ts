/**
 * 上櫃(TPEX,櫃買中心)資料層 — 作為上市(TWSE)抓不到資料時的 fallback。
 *
 * ⚠️ 注意:櫃買中心網站結構曾改版,這些端點為「最佳已知值」,
 *    全程以 try/catch 容錯:抓不到即回空陣列,讓上層優雅降級。
 *    若實際回應有出入,只需調整本檔的 URL 與欄位索引即可,
 *    不影響上市(TWSE)路徑。
 *
 * 共用型別沿用 lib/twse.ts(型別匯入於編譯期會被抹除,無 runtime 循環)。
 */

import type { Candle, InstitutionalRow } from "./twse";

const TPEX_BASE = "https://www.tpex.org.tw/web/stock";

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function cachedFetchJson(url: string, ttlMs: number): Promise<any> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TaiwanStockDashboard/0.1; +https://github.com)",
      Accept: "application/json, text/plain, */*",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TPEX 請求失敗 ${res.status}: ${url}`);
  const json = await res.json();
  cache.set(url, { value: json, expires: Date.now() + ttlMs });
  return json;
}

function num(s: unknown): number | null {
  if (s == null) return null;
  const cleaned = String(s).replace(/,/g, "").trim();
  if (cleaned === "" || cleaned === "--") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** 民國年月字串,如 "115/01" */
function rocYearMonth(d: Date): string {
  const roc = d.getFullYear() - 1911;
  return `${roc}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 民國年月日字串,如 "115/01/02" */
function rocYmd(d: Date): string {
  const roc = d.getFullYear() - 1911;
  return `${roc}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** 把 "115/01/02"(民國)轉成 "2026-01-02" */
function rocToIso(roc: string): string | null {
  const m = roc.trim().match(/^(\d+)\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]) + 1911;
  return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/**
 * 上櫃個股日 K 線(st43_result,一次回傳一個月)。
 * 欄位(aaData):0 日期, 1 成交仟股, 2 成交仟元, 3 開, 4 高, 5 低, 6 收, 7 漲跌, 8 筆數
 */
export async function getTpexDailyCandles(
  stockNo: string,
  months = 6
): Promise<Candle[]> {
  const now = new Date();
  const requests: Promise<any>[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const url = `${TPEX_BASE}/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=${rocYearMonth(
      d
    )}&stkno=${stockNo}`;
    const ttl = i === 0 ? 5 * 60_000 : 24 * 60 * 60_000;
    requests.push(cachedFetchJson(url, ttl).catch(() => null));
  }

  const candles: Candle[] = [];
  const results = await Promise.all(requests);
  for (const json of results) {
    const rows = json?.aaData;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const date = rocToIso(row[0]);
      const open = num(row[3]);
      const high = num(row[4]);
      const low = num(row[5]);
      const close = num(row[6]);
      const volKShares = num(row[1]); // 成交仟股
      if (!date || open == null || high == null || low == null || close == null)
        continue;
      candles.push({
        date,
        open,
        high,
        low,
        close,
        volume: volKShares != null ? volKShares * 1000 : 0, // 轉為股,與 TWSE 一致
      });
    }
  }

  const seen = new Set<string>();
  return candles
    .filter((c) => (seen.has(c.date) ? false : seen.add(c.date)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 上櫃三大法人買賣超(3itrade_hedge,一次回傳某天全部個股)。
 * 往回逐日抓近 days 個交易日並過濾出該檔。單位轉為「股」以與 TWSE 一致。
 */
export async function getTpexInstitutional(
  stockNo: string,
  days = 20
): Promise<InstitutionalRow[]> {
  const now = new Date();
  const requests: { date: string; p: Promise<any> }[] = [];
  for (let i = 0; i < days * 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const url = `${TPEX_BASE}/3insti/daily_trade/3itrade_hedge_result.php?l=zh-tw&se=EW&t=D&d=${rocYmd(
      d
    )}`;
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
    const data = json?.aaData;
    if (!Array.isArray(data)) return;
    // 以代號比對(通常在第 0 欄)。各欄位為買賣超「股數」,
    // 結構欄位數較多,這裡取常見位置:外資合計、投信、自營合計、三大法人合計。
    const match = data.find((r: string[]) => (r[0] || "").trim() === stockNo);
    if (!match) return;
    // 容錯:從尾端找「三大法人合計」,並盡量取得各分項。
    const total = num(match[match.length - 1]);
    rows.push({
      date: requests[idx].date,
      foreign: num(match[10]) ?? 0, // 外資及陸資合計(常見位置)
      trust: num(match[13]) ?? 0, // 投信合計
      dealer: num(match[match.length - 2]) ?? 0, // 自營商合計
      total: total ?? 0,
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
}
