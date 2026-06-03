"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const POPULAR = [
  { no: "2330", name: "台積電" },
  { no: "2317", name: "鴻海" },
  { no: "2454", name: "聯發科" },
  { no: "2412", name: "中華電" },
  { no: "0050", name: "元大台灣50" },
  { no: "2891", name: "中信金" },
  { no: "6488", name: "環球晶(櫃)" },
];

export default function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(stockNo: string) {
    const id = stockNo.trim();
    if (!id) return;
    router.push(`/stock/${encodeURIComponent(id)}`);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex gap-2"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="輸入股票代號,例如 2330"
          inputMode="numeric"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-5 py-3 font-medium hover:bg-sky-500"
        >
          查詢
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {POPULAR.map((s) => (
          <button
            key={s.no}
            onClick={() => go(s.no)}
            className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-sky-500 hover:text-white"
          >
            {s.no} {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
