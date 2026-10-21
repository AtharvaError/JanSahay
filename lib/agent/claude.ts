import Anthropic from "@anthropic-ai/sdk";
import type { LangCode } from "@/lib/translations";
import { SYSTEM_PROMPT, contextBlock } from "./prompt";
import { TOOL_DEFS, executeToolAsync, type ToolContext } from "./tools.server";
import type { AgentResponse, ChatTurn, ImageAttachment, TrackedApplication, UserProfile } from "./types";

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 8;

// Created lazily so the app still boots (offline agent) without credentials.
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export async function runClaudeAgent(input: {
  history: ChatTurn[];
  message: string;
  lang: LangCode;
  profile: UserProfile;
  applications: TrackedApplication[];
  attachment?: ImageAttachment;
}): Promise<AgentResponse> {
  const ctx: ToolContext = {
    profile: { ...input.profile }, applications: input.applications, artifacts: {}, traces: [], attachment: input.attachment,
  };

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...input.history.slice(-16).map(t => ({ role: t.role, content: t.content })),
    {
      role: "user",
      content: `${contextBlock(input.lang, ctx.profile, input.applications, Boolean(input.attachment))}\n\n${input.message}`,
    },
  ];
  // The API requires the first message to be from the user.
  while (messages.length && messages[0].role !== "user") messages.shift();

  let reply = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" }, // conversational latency matters for voice
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFS as Anthropic.Beta.BetaTool[],
      messages,
    });

    if (response.stop_reason === "refusal") {
      reply = "Sorry, I can't help with that request. / माफ़ कीजिए, मैं इसमें मदद नहीं कर सकता।";
      break;
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();
    if (text) reply = text;

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: response.content });

    // All tool results go back in ONE user message.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = await Promise.all(toolUses.map(async tu => {
      try {
        const out = await executeToolAsync(tu.name, (tu.input ?? {}) as Record<string, unknown>, ctx);
        return { type: "tool_result" as const, tool_use_id: tu.id, content: JSON.stringify(out) };
      } catch (err) {
        return { type: "tool_result" as const, tool_use_id: tu.id, content: `Tool error: ${(err as Error).message}`, is_error: true };
      }
    }));
    messages.push({ role: "user", content: results });
  }

  return {
    reply: reply || "…",
    profile: ctx.profile,
    toolCalls: ctx.traces,
    artifacts: ctx.artifacts,
    engine: "claude",
  };
}

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
