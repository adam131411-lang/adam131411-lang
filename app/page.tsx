import SearchBox from "@/components/SearchBox";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3 pt-6">
        <h1 className="text-3xl font-bold">查詢台股</h1>
        <p className="text-slate-400">
          輸入股票代號,即可查看日 K 線、技術指標(MA / KD / MACD / RSI)、
          三大法人買賣超與本益比/殖利率等基本面資料。
        </p>
      </section>
      <SearchBox />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
        {[
          ["📊 即時/日線報價", "開高低收、成交量與 K 線圖"],
          ["📈 技術指標", "MA、KD、MACD、RSI 一次看"],
          ["🏦 三大法人", "外資、投信、自營商買賣超"],
          ["💰 基本面", "本益比、殖利率、股價淨值比"],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-sm text-slate-400">{desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
