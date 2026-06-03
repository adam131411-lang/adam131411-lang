"use client";

import { useRef, useState } from "react";

/**
 * AI 深度分析面板:點擊後串流呼叫 /api/analyze,即時顯示 Claude 產生的分析。
 * 內容為 Markdown,這裡以 pre-wrap 呈現(保留段落與標題符號)。
 */
export default function AnalysisPanel({
  stockNo,
  name,
}: {
  stockNo: string;
  name?: string;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    setText("");
    setStatus("loading");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const url = `/api/analyze/${stockNo}?name=${encodeURIComponent(
        name ?? stockNo
      )}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setText(data.error || `分析請求失敗(${res.status})`);
        setStatus("done");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // 串流讀取,逐塊追加
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setText((prev) => prev + `\n\n⚠️ ${(e as Error).message}`);
      }
      setStatus("done");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStatus("done");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {status !== "loading" ? (
          <button
            onClick={run}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
          >
            ✨ {status === "done" ? "重新分析" : "產生 AI 深度分析"}
          </button>
        ) : (
          <button
            onClick={stop}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:border-slate-400"
          >
            ⏹ 停止
          </button>
        )}
        {status === "loading" && (
          <span className="text-sm text-slate-400 animate-pulse">
            分析中(含即時網路搜尋,可能需數十秒)…
          </span>
        )}
      </div>

      {text && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
          {text}
          {status === "loading" && <span className="animate-pulse">▍</span>}
        </div>
      )}

      {status === "idle" && (
        <p className="text-xs text-slate-500">
          由 Claude 即時搜尋當前財報與股價後產生,涵蓋財務體質、估值、成長與多空觀點。
          僅供參考,非投資建議。
        </p>
      )}
    </div>
  );
}
