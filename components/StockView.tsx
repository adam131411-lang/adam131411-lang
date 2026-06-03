"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type {
  Candle,
  InstitutionalRow,
  RealtimeQuote,
  Valuation,
} from "@/lib/twse";
import type { Financials } from "@/lib/financials";
import IndicatorPanel from "./IndicatorPanel";
import InstitutionalTable from "./InstitutionalTable";
import FinancialsPanel from "./FinancialsPanel";
import AnalysisPanel from "./AnalysisPanel";

// lightweight-charts 只能在瀏覽器執行,關閉 SSR
const CandleChart = dynamic(() => import("./CandleChart"), { ssr: false });

type QuoteResp = {
  stockNo: string;
  realtime: RealtimeQuote | null;
  candles: Candle[];
  error?: string;
};

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-300">{title}</h2>
      {children}
    </section>
  );
}

function changeColor(v: number | null | undefined) {
  if (v == null || v === 0) return "text-slate-300";
  return v > 0 ? "text-up" : "text-down";
}

export default function StockView({ stockNo }: { stockNo: string }) {
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [inst, setInst] = useState<InstitutionalRow[]>([]);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/quote/${stockNo}?months=8`)
      .then((r) => r.json())
      .then((data: QuoteResp) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setQuote(data);
      })
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));

    fetch(`/api/institutional/${stockNo}?days=20`)
      .then((r) => r.json())
      .then((d) => !cancelled && setInst(d.rows ?? []))
      .catch(() => {});

    fetch(`/api/valuation/${stockNo}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setValuation(d.valuation ?? null))
      .catch(() => {});

    fetch(`/api/financials/${stockNo}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setFinancials(d.financials ?? null))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [stockNo]);

  const rt = quote?.realtime;
  const lastCandle = quote?.candles?.[quote.candles.length - 1];
  const price = rt?.price ?? lastCandle?.close ?? null;

  return (
    <div className="space-y-5">
      {/* 標題列 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold">{rt?.name ?? stockNo}</h1>
            <span className="text-slate-400">{stockNo}</span>
          </div>
          {price != null && (
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className={`text-3xl font-bold tabular-nums ${changeColor(
                  rt?.change
                )}`}
              >
                {price.toFixed(2)}
              </span>
              {rt?.change != null && (
                <span className={`${changeColor(rt.change)} tabular-nums`}>
                  {rt.change > 0 ? "▲" : rt.change < 0 ? "▼" : ""}{" "}
                  {Math.abs(rt.change).toFixed(2)} (
                  {rt.changePercent?.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
          {rt?.time && (
            <div className="mt-1 text-xs text-slate-500">更新:{rt.time}</div>
          )}
        </div>

        {/* 基本面快照 */}
        <div className="flex gap-4 text-sm">
          {[
            ["本益比", valuation?.pe],
            ["殖利率", valuation?.dividendYield, "%"],
            ["股價淨值比", valuation?.pbr],
          ].map(([label, v, suffix]) => (
            <div key={label as string} className="text-right">
              <div className="text-xs text-slate-400">{label as string}</div>
              <div className="text-lg font-semibold tabular-nums">
                {v == null ? "—" : `${(v as number).toFixed(2)}${suffix ?? ""}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      )}
      {loading && !quote && (
        <div className="text-slate-400">載入中…</div>
      )}

      {quote && quote.candles.length > 0 && (
        <>
          <Card title="日 K 線 / 成交量 / 移動平均">
            <CandleChart candles={quote.candles} />
          </Card>
          <Card title="技術指標">
            <IndicatorPanel candles={quote.candles} />
          </Card>
        </>
      )}

      <Card title="🤖 AI 深度分析">
        <AnalysisPanel stockNo={stockNo} name={rt?.name} />
      </Card>

      <Card title="財報 / 基本面(月營收 · EPS)">
        <FinancialsPanel data={financials} />
      </Card>

      <Card title="三大法人買賣超(近 20 個交易日)">
        <InstitutionalTable rows={inst} />
      </Card>
    </div>
  );
}
