import { NextRequest, NextResponse } from "next/server";
import { getDailyCandles, getRealtime } from "@/lib/twse";

export const dynamic = "force-dynamic";

/**
 * GET /api/quote/2330?months=6
 * 回傳:即時報價 + 日 K 線。
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stockNo = id.trim();
  if (!/^\d{4,6}[A-Z]?$/.test(stockNo)) {
    return NextResponse.json({ error: "股票代號格式錯誤" }, { status: 400 });
  }
  const months = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("months") ?? 6), 1),
    12
  );

  try {
    const [candles, realtime] = await Promise.all([
      getDailyCandles(stockNo, months),
      getRealtime(stockNo).catch(() => null),
    ]);
    if (candles.length === 0 && !realtime) {
      return NextResponse.json(
        { error: "查無此股票資料,請確認代號" },
        { status: 404 }
      );
    }
    return NextResponse.json({ stockNo, realtime, candles });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
