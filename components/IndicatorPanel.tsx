"use client";

import type { Candle } from "@/lib/twse";
import { kd, macd, rsi } from "@/lib/indicators";

function last<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]!;
  return null;
}

function fmt(v: number | null): string {
  return v == null ? "—" : v.toFixed(2);
}

/** 技術指標數值面板:KD、RSI、MACD 的最新值。 */
export default function IndicatorPanel({ candles }: { candles: Candle[] }) {
  if (candles.length < 30) {
    return (
      <p className="text-sm text-slate-400">資料不足,無法計算技術指標。</p>
    );
  }
  const close = candles.map((c) => c.close);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);

  const { k, d } = kd(high, low, close);
  const rsiVals = rsi(close, 14);
  const { macd: dif, signal, histogram } = macd(close);

  const kVal = last(k);
  const dVal = last(d);
  const rsiVal = last(rsiVals);
  const difVal = last(dif);
  const sigVal = last(signal);
  const histVal = last(histogram);

  const items: { label: string; value: string; hint?: string }[] = [
    { label: "K (9)", value: fmt(kVal) },
    { label: "D (9)", value: fmt(dVal) },
    {
      label: "KD 訊號",
      value:
        kVal != null && dVal != null ? (kVal > dVal ? "偏多" : "偏空") : "—",
    },
    { label: "RSI (14)", value: fmt(rsiVal) },
    { label: "MACD DIF", value: fmt(difVal) },
    { label: "MACD 訊號線", value: fmt(sigVal) },
    {
      label: "MACD 柱",
      value: fmt(histVal),
      hint: histVal != null ? (histVal >= 0 ? "紅柱" : "綠柱") : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"
        >
          <div className="text-xs text-slate-400">{it.label}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {it.value}
            {it.hint && (
              <span className="ml-1 text-xs text-slate-500">{it.hint}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
