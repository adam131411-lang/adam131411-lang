import { NextRequest, NextResponse } from "next/server";
import { getInstitutional } from "@/lib/twse";

export const dynamic = "force-dynamic";

/**
 * GET /api/institutional/2330?days=20
 * 回傳:近 N 個交易日三大法人買賣超(外資/投信/自營)。
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
  const days = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("days") ?? 20), 1),
    40
  );

  try {
    const rows = await getInstitutional(stockNo, days);
    return NextResponse.json({ stockNo, rows });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 }
    );
  }
}
