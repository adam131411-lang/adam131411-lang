import { NextRequest, NextResponse } from "next/server";
import { getValuation } from "@/lib/twse";

export const dynamic = "force-dynamic";

/**
 * GET /api/valuation/2330
 * 回傳:本益比 / 殖利率 / 股價淨值比(基本面快照)。
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stockNo = id.trim();
  if (!/^\d{4,6}[A-Z]?$/.test(stockNo)) {
    return NextResponse.json({ error: "股票代號格式錯誤" }, { status: 400 });
  }

  try {
    const valuation = await getValuation(stockNo);
    return NextResponse.json({ stockNo, valuation });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
