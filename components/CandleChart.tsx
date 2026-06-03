"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/twse";
import { sma } from "@/lib/indicators";

function toTime(date: string): UTCTimestamp {
  return (new Date(date + "T00:00:00Z").getTime() / 1000) as UTCTimestamp;
}

/** K 線主圖:蠟燭 + MA5/MA20/MA60 + 成交量。(lightweight-charts v4 API) */
export default function CandleChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;
    const el = containerRef.current;

    const chart: IChartApi = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.2)" },
      timeScale: { borderColor: "rgba(148,163,184,0.2)", timeVisible: false },
      crosshair: { mode: 0 },
      height: 420,
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      // 台股慣例:紅漲綠跌
      upColor: "#e53935",
      downColor: "#2e7d32",
      borderUpColor: "#e53935",
      borderDownColor: "#2e7d32",
      wickUpColor: "#e53935",
      wickDownColor: "#2e7d32",
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: toTime(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    // 成交量(疊在下方)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: toTime(c.date),
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(229,57,53,0.4)" : "rgba(46,125,50,0.4)",
      }))
    );

    // 移動平均線
    const closes = candles.map((c) => c.close);
    const maConfigs: [number, string][] = [
      [5, "#fbbf24"],
      [20, "#38bdf8"],
      [60, "#c084fc"],
    ];
    for (const [period, color] of maConfigs) {
      const series = chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const values = sma(closes, period);
      series.setData(
        candles
          .map((c, i) => ({ time: toTime(c.date), value: values[i] }))
          .filter((p) => p.value != null) as {
          time: UTCTimestamp;
          value: number;
        }[]
      );
    }

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles]);

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <div className="mt-2 flex gap-4 text-xs text-slate-400">
        <span className="text-amber-400">MA5</span>
        <span className="text-sky-400">MA20</span>
        <span className="text-purple-400">MA60</span>
      </div>
    </div>
  );
}
