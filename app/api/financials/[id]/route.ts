import { NextRequest, NextResponse } from "next/server";
import { getFinancials } from "@/lib/financials";

export const dynamic = "force-dynamic";

/**
 * GET /api/financials/2330
 * 回傳:月營收 + 綜合損益表(EPS / 毛利 / 淨利)。
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
    const financials = await getFinancials(stockNo);
    return NextResponse.json({ stockNo, financials });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
