"use client";

import type { InstitutionalRow } from "@/lib/twse";

/** 把「股數」轉成「張」(1 張 = 1000 股),含正負號顏色。 */
function Lots({ shares }: { shares: number }) {
  const lots = Math.round(shares / 1000);
  const cls =
    lots > 0 ? "text-up" : lots < 0 ? "text-down" : "text-slate-400";
  return (
    <span className={`tabular-nums ${cls}`}>
      {lots > 0 ? "+" : ""}
      {lots.toLocaleString()}
    </span>
  );
}

/** 三大法人買賣超表(單位:張)。 */
export default function InstitutionalTable({
  rows,
}: {
  rows: InstitutionalRow[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">查無三大法人資料。</p>;
  }
  // 最新在上
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-800">
            <th className="py-2 pr-4 font-medium">日期</th>
            <th className="py-2 pr-4 font-medium text-right">外資</th>
            <th className="py-2 pr-4 font-medium text-right">投信</th>
            <th className="py-2 pr-4 font-medium text-right">自營商</th>
            <th className="py-2 font-medium text-right">合計</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.date} className="border-b border-slate-900">
              <td className="py-2 pr-4 text-slate-300">{r.date}</td>
              <td className="py-2 pr-4 text-right">
                <Lots shares={r.foreign} />
              </td>
              <td className="py-2 pr-4 text-right">
                <Lots shares={r.trust} />
              </td>
              <td className="py-2 pr-4 text-right">
                <Lots shares={r.dealer} />
              </td>
              <td className="py-2 text-right font-semibold">
                <Lots shares={r.total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">單位:張(1 張 = 1000 股)</p>
    </div>
  );
}
