// Free LLM engine: Sarvam AI chat completions (OpenAI-compatible tool calling), built for
// Indian languages. Uses the same tools, prompt and confirmation rules as the Claude agent.
import type { LangCode } from "@/lib/translations";
import { SYSTEM_PROMPT, contextBlock } from "./prompt";
import { TOOL_DEFS, executeToolAsync, type ToolContext } from "./tools.server";
import type { AgentResponse, ChatTurn, ImageAttachment, TrackedApplication, UserProfile } from "./types";

const ENDPOINT = "https://api.sarvam.ai/v1/chat/completions";
// sarvam-105b-conversations answers in ~0.5 s (no long reasoning) — right for voice.
const MODEL = process.env.SARVAM_CHAT_MODEL || "sarvam-105b-conversations";
const MAX_TOOL_ROUNDS = 8;
const TIMEOUT_MS = 45_000;

export const sarvamChatConfigured = () => Boolean(process.env.SARVAM_API_KEY);

interface ToolCall { id: string; type: "function"; function: { name: string; arguments: string } }
type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const TOOLS = TOOL_DEFS.map(t => ({
  type: "function" as const,
  function: { name: t.name, description: t.description ?? "", parameters: t.input_schema },
}));

const LANG_NAMES: Record<LangCode, string> = {
  en: "English", hi: "Hindi (Devanagari)", mr: "Marathi (Devanagari)", bn: "Bengali (Bengali script)",
  ta: "Tamil (Tamil script)", te: "Telugu (Telugu script)", gu: "Gujarati (Gujarati script)", kn: "Kannada (Kannada script)",
};

async function chat(messages: ChatMessage[]) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "api-subscription-key": process.env.SARVAM_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto", temperature: 0.3, max_tokens: 1500 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Sarvam chat ${res.status}: ${json?.error?.message ?? "request failed"}`);
  const msg = json.choices?.[0]?.message;
  if (!msg) throw new Error("Sarvam chat returned no message");
  return msg as { content: string | null; tool_calls?: ToolCall[] | null };
}

/** Remove reasoning tags some models emit, and markdown the TTS would read aloud. */
function cleanReply(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .trim();
}

export async function runSarvamAgent(input: {
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

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nIMPORTANT: Always reply in ${LANG_NAMES[input.lang]} unless the citizen clearly writes in another language. Always use the tools; call update_profile as soon as the citizen states any fact (state, gender, age, occupation, income, category…) — in the same turn, before you reply. Never say you saved or noted something unless you called update_profile in this turn.`,
    },
    ...input.history.slice(-16).map(t => ({ role: t.role, content: t.content }) as ChatMessage),
    { role: "user", content: `${contextBlock(input.lang, ctx.profile, input.applications, Boolean(input.attachment))}\n\n${input.message}` },
  ];
  // History must start after the system message with a user turn.
  while (messages.length > 1 && messages[1].role !== "user") messages.splice(1, 1);

  let reply = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const msg = await chat(messages);
    if (msg.content) reply = cleanReply(msg.content) || reply;
    const calls = msg.tool_calls ?? [];
    if (!calls.length) break;

    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
    for (const call of calls) {
      let content: string;
      try {
        const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
        const out = await executeToolAsync(call.function.name, (args ?? {}) as Record<string, unknown>, ctx);
        content = JSON.stringify(out);
      } catch (err) {
        content = JSON.stringify({ error: (err as Error).message });
      }
      messages.push({ role: "tool", tool_call_id: call.id, content });
    }
  }

  return {
    reply: reply || "…",
    profile: ctx.profile,
    toolCalls: ctx.traces,
    artifacts: ctx.artifacts,
    engine: "sarvam",
  };
}
