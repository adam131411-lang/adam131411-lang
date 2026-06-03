import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * AI 深度分析:把專案內的「個股分析 skill」當作 system prompt,
 * 透過 Claude API + web_search 工具產生結構化分析。
 *
 * 需要環境變數 ANTHROPIC_API_KEY(見 .env.example)。
 */

// 分析模型(可用 ANALYSIS_MODEL 覆寫;預設用最新、最強的 Opus)
export const ANALYSIS_MODEL = process.env.ANALYSIS_MODEL || "claude-opus-4-8";

let cachedClient: Anthropic | null = null;
export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

// skill 內容不會變,讀一次就快取在記憶體
const skillCache = new Map<string, string>();

/**
 * 讀取指定 skill 的 SKILL.md 內容(去掉 frontmatter,只留下指示本文)。
 * 找不到時回傳 null。
 */
export async function loadSkillPrompt(skillName: string): Promise<string | null> {
  if (skillCache.has(skillName)) return skillCache.get(skillName)!;
  try {
    const path = join(
      process.cwd(),
      ".claude",
      "skills",
      skillName,
      "SKILL.md"
    );
    const raw = await readFile(path, "utf8");
    // 去除開頭的 YAML frontmatter(--- ... ---)
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
    skillCache.set(skillName, body);
    return body;
  } catch {
    return null;
  }
}
