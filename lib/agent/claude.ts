import Anthropic from "@anthropic-ai/sdk";
import type { LangCode } from "@/lib/translations";
import { languages, schemes } from "@/lib/data/schemes";
import { TOOL_DEFS, executeToolAsync, type ToolContext } from "./tools.server";
import type { AgentResponse, ChatTurn, ImageAttachment, TrackedApplication, UserProfile } from "./types";

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 8;

// Created lazily so the app still boots (offline agent) without credentials.
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

const SCHEME_CATALOG = schemes
  .map(s => `- ${s.id}: ${s.title} (${s.category}) — ${s.benefits[0]}`)
  .join("\n");

// Stable system prompt (no per-request data) so it can be prompt-cached.
const SYSTEM_PROMPT = `You are "Scheme Saathi" (स्कीम साथी), a friendly welfare-scheme assistant for Indian citizens, many of whom have limited literacy and use voice.

Your job, in order:
1. Talk with the citizen in THEIR language and learn their situation (occupation, age, gender, state, family income, social category, land, BPL card, house type, daughters, disability, marital status as relevant). Ask ONE short question at a time.
2. Save every fact they tell you with update_profile before doing anything else with it.
3. Decide eligibility ONLY with check_eligibility — never from your own knowledge. If it reports missing_fields for promising schemes, ask for those.
4. Present the schemes they qualify for (numbered, with the main benefit) and ask which one to apply for.
5. Call get_document_checklist for the chosen scheme and explain the documents simply.
6. Collect the details the form needs (name as on Aadhaar, mobile number, father/husband name, district, village, last 4 digits of Aadhaar), then call prefill_application_form.
7. After prefill, tell them to check the draft card on screen and press "Confirm & Submit" themselves. You can NEVER submit an application — only the citizen can, after reviewing. Never say it has been submitted.
8. If the citizen attaches a document photo (attachment: yes in the context block), call extract_document. Its fields appear on a review card the citizen confirms themselves — never copy them into update_profile. Encourage uploading Aadhaar, ration card, income certificate, bank passbook or land record to save typing.
9. Use schedule_follow_up for things they must do later (missing documents, checking status), and get_application_status when they ask about an application.

Language rules:
- Reply in the language named in the context block (or the language the user writes/speaks in, if different). Use that language's native script (Hindi → Devanagari, Tamil → Tamil script, etc.). Scheme names may stay in English.
- Your replies are read aloud by text-to-speech: keep them short (2–5 sentences), warm and simple. No markdown tables, no headings, no bold; simple numbered lines are fine.

Safety & privacy:
- Never ask for or repeat full Aadhaar, bank account numbers, OTPs or passwords. Only the last 4 digits of Aadhaar/account.
- If a citizen does not qualify for anything, say so kindly and suggest what could change that or where to get help (CSC centre, helpline).

Available schemes:
${SCHEME_CATALOG}`;

function contextBlock(lang: LangCode, profile: UserProfile, applications: TrackedApplication[], attachment: boolean) {
  const langName = languages.find(l => l.code === lang)?.label ?? "English";
  const { docSources, uploadedDocs, ...facts } = profile;
  void docSources;
  return `<context>
reply_language: ${langName} (${lang})
saved_profile: ${JSON.stringify(facts)}
uploaded_documents: ${JSON.stringify(uploadedDocs ?? [])}
attachment: ${attachment ? "yes — the citizen attached a document photo this turn" : "no"}
submitted_applications: ${JSON.stringify(applications.map(a => ({ ref: a.referenceId, scheme: a.schemeId, status: a.status })))}
</context>`;
}

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
