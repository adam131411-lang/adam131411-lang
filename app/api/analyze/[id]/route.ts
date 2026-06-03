import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getClient, loadSkillPrompt, ANALYSIS_MODEL } from "@/lib/anthropic";

export const dynamic = "force-dynamic";
// 分析可能跑較久(含 web 搜尋),放寬執行時間上限
export const maxDuration = 120;

/**
 * GET /api/analyze/2330?name=台積電
 * 以 stock-deepdive-tw skill 為 system prompt,串流回傳 AI 深度分析。
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
  const name = req.nextUrl.searchParams.get("name")?.trim() || stockNo;

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "尚未設定 ANTHROPIC_API_KEY,無法使用 AI 分析。請參考 .env.example 設定後重試。",
      },
      { status: 503 }
    );
  }

  const systemPrompt = await loadSkillPrompt("stock-deepdive-tw");
  if (!systemPrompt) {
    return NextResponse.json(
      { error: "找不到分析 skill(.claude/skills/stock-deepdive-tw)" },
      { status: 500 }
    );
  }

  const userPrompt =
    `請針對台股「${name}」(股票代號 ${stockNo})做一份深度分析。` +
    `先用 web_search 查當前股價、最新財報與月營收等數據,再依 skill 的模組產出。`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: ANALYSIS_MODEL,
          max_tokens: 8000,
          // Opus 4.8:adaptive thinking(唯一支援的 on 模式)
          thinking: { type: "adaptive" },
          // 個股分析屬於需要思考的工作,用 high effort
          output_config: { effort: "high" },
          system: [
            {
              type: "text",
              text: systemPrompt,
              // skill 內容固定 → 快取,降低重複請求成本
              cache_control: { type: "ephemeral" },
            },
          ],
          // 伺服器端 web 搜尋(含動態過濾),滿足 skill「先即時搜尋」要求
          tools: [{ type: "web_search_20260209", name: "web_search" }],
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        await stream.finalMessage();
      } catch (err) {
        let msg = (err as Error).message;
        if (err instanceof Anthropic.AuthenticationError)
          msg = "ANTHROPIC_API_KEY 無效或未授權。";
        else if (err instanceof Anthropic.RateLimitError)
          msg = "已達 API 速率上限,請稍後再試。";
        controller.enqueue(encoder.encode(`\n\n⚠️ 分析發生錯誤:${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
