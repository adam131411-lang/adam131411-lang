"use client";

import type { Financials } from "@/lib/financials";

function fmtPercent(v: number | null): { text: string; cls: string } {
  if (v == null) return { text: "—", cls: "text-slate-300" };
  const cls = v > 0 ? "text-up" : v < 0 ? "text-down" : "text-slate-300";
  return { text: `${v > 0 ? "+" : ""}${v.toFixed(2)}%`, cls };
}

/** 把「仟元」轉為較易讀的「億 / 萬」。 */
function fmtThousand(v: number | null): string {
  if (v == null) return "—";
  const dollars = v * 1000; // 原始單位為仟元
  if (Math.abs(dollars) >= 1e8)
    return `${(dollars / 1e8).toFixed(2)} 億`;
  if (Math.abs(dollars) >= 1e4) return `${(dollars / 1e4).toFixed(0)} 萬`;
  return dollars.toLocaleString();
}

function Stat({
  label,
  value,
  cls = "",
}: {
  label: string;
  value: string;
  cls?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${cls}`}>
        {value}
      </div>
    </div>
  );
}

/** 財報面板:月營收(含 MoM/YoY)+ 損益表(EPS / 毛利 / 淨利)。 */
export default function FinancialsPanel({ data }: { data: Financials | null }) {
  if (!data || !data.available) {
    return (
      <p className="text-sm text-slate-400">
        暫無財報資料(可能尚未公布,或此標的非一般上市公司)。
      </p>
    );
  }
  const rev = data.monthlyRevenue;
  const inc = data.income;
  const mom = fmtPercent(rev?.momPercent ?? null);
  const yoy = fmtPercent(rev?.yoyPercent ?? null);

  return (
    <div className="space-y-4">
      {rev && (
        <div>
          <div className="mb-2 text-xs text-slate-500">
            月營收{rev.period ? `(資料年月 ${rev.period})` : ""}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="當月營收" value={fmtThousand(rev.revenue)} />
            <Stat label="月增率 (MoM)" value={mom.text} cls={mom.cls} />
            <Stat label="年增率 (YoY)" value={yoy.text} cls={yoy.cls} />
          </div>
        </div>
      )}
      {inc && (
        <div>
          <div className="mb-2 text-xs text-slate-500">
            綜合損益表{inc.period ? `(${inc.period})` : ""}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="EPS(每股盈餘)"
              value={inc.eps == null ? "—" : `${inc.eps.toFixed(2)} 元`}
            />
            <Stat label="營業收入" value={fmtThousand(inc.revenue)} />
            <Stat label="營業毛利" value={fmtThousand(inc.grossProfit)} />
            <Stat label="本期淨利" value={fmtThousand(inc.netIncome)} />
          </div>
        </div>
      )}
    </div>
  );
}
