/**
 * 財報 / 基本面資料層 — 使用「證交所 OpenAPI」(https://openapi.twse.com.tw)。
 *
 * 相較於 RWD 端點,OpenAPI 回傳乾淨的 JSON 陣列、免金鑰,
 * 一次回傳「全部上市公司」的某張報表,我們再用公司代號過濾。
 *
 * ⚠️ 這些資料集每月/每季才更新,因此快取 TTL 設很長。
 * ⚠️ 由於資料集代碼偶有調整,所有解析都採「容錯」策略:
 *    抓不到或欄位對不上時回傳 null / available:false,讓 UI 優雅降級,
 *    不會讓整頁壞掉。可在 https://openapi.twse.com.tw/ 對照最新代碼。
 */

const OPENAPI_BASE = "https://openapi.twse.com.tw/v1";

type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function cachedFetchJson(url: string, ttlMs: number): Promise<any> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenAPI 請求失敗 ${res.status}: ${url}`);
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

/** 在物件中以「中文關鍵字子字串」找出對應欄位值(欄位名稱常有變動,故用子字串比對)。 */
function pick(row: Record<string, unknown>, ...keywords: string[]): unknown {
  for (const key of Object.keys(row)) {
    if (keywords.some((kw) => key.includes(kw))) return row[key];
  }
  return undefined;
}

export type MonthlyRevenue = {
  period: string; // 資料年月,如 "11504"(民國)
  revenue: number | null; // 當月營收(仟元)
  momPercent: number | null; // 與上月比較增減(%)
  yoyPercent: number | null; // 與去年同月增減(%)
};

/**
 * 上市公司每月營業收入彙總表。
 * 資料集:t187ap05_L(上市公司每月營業收入彙總表)
 */
export async function getMonthlyRevenue(
  stockNo: string
): Promise<MonthlyRevenue | null> {
  const url = `${OPENAPI_BASE}/opendata/t187ap05_L`;
  const list: Record<string, unknown>[] = await cachedFetchJson(
    url,
    6 * 60 * 60_000
  ).catch(() => null);
  if (!Array.isArray(list)) return null;
  const row = list.find(
    (r) => String(pick(r, "公司代號", "出表") ?? "").trim() === stockNo
  );
  if (!row) return null;
  return {
    period: String(pick(row, "資料年月") ?? "").trim(),
    revenue: num(pick(row, "當月營收")),
    momPercent: num(pick(row, "上月比較增減", "與上月")),
    yoyPercent: num(pick(row, "去年同月增減", "與去年同月")),
  };
}

export type IncomeStatement = {
  period: string; // 財報期別,如 "115/01"(年/季)
  eps: number | null; // 基本每股盈餘(元)
  revenue: number | null; // 營業收入
  grossProfit: number | null; // 營業毛利
  netIncome: number | null; // 本期淨利(損)
};

// 綜合損益表依產業別分多個資料集(一般業/金融/證券/保險/其他)。
const INCOME_DATASETS = [
  "t187ap06_L_ci", // 一般業
  "t187ap06_L_basi", // 金融保險業
  "t187ap06_L_bd", // 證券業
  "t187ap06_L_mim", // 其他業
  "t187ap06_L_ins", // 保險業
];

/**
 * 綜合損益表(取 EPS、營收、毛利、淨利)。
 * 會依序嘗試各產業別資料集,找到該公司為止。
 */
export async function getIncomeStatement(
  stockNo: string
): Promise<IncomeStatement | null> {
  for (const ds of INCOME_DATASETS) {
    const url = `${OPENAPI_BASE}/opendata/${ds}`;
    const list: Record<string, unknown>[] = await cachedFetchJson(
      url,
      6 * 60 * 60_000
    ).catch(() => null);
    if (!Array.isArray(list)) continue;
    const row = list.find(
      (r) => String(pick(r, "公司代號") ?? "").trim() === stockNo
    );
    if (!row) continue;
    const year = String(pick(row, "年度") ?? "").trim();
    const season = String(pick(row, "季別") ?? "").trim();
    return {
      period: year && season ? `${year} Q${season}` : year || season,
      eps: num(pick(row, "基本每股盈餘", "每股盈餘")),
      revenue: num(pick(row, "營業收入")),
      grossProfit: num(pick(row, "營業毛利")),
      netIncome: num(pick(row, "本期淨利", "稅後淨利", "繼續營業單位")),
    };
  }
  return null;
}

export type Financials = {
  available: boolean;
  monthlyRevenue: MonthlyRevenue | null;
  income: IncomeStatement | null;
};

/** 彙整月營收 + 損益表(EPS)。任一失敗都不影響另一項。 */
export async function getFinancials(stockNo: string): Promise<Financials> {
  const [monthlyRevenue, income] = await Promise.all([
    getMonthlyRevenue(stockNo).catch(() => null),
    getIncomeStatement(stockNo).catch(() => null),
  ]);
  return {
    available: monthlyRevenue != null || income != null,
    monthlyRevenue,
    income,
  };
}
