import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/ratelimit.server";
import type { LangCode } from "@/lib/translations";
import { runClaudeAgent } from "@/lib/agent/claude";
import { runSarvamAgent, sarvamChatConfigured } from "@/lib/agent/sarvam";
import { activeEngine } from "@/lib/agent/engine.server";
import { extractFacts } from "@/lib/agent/nlu";
import { mergeProfile, sanitizeProfile } from "@/lib/agent/tools.server";
import { runOfflineAgent, type OfflineState } from "@/lib/agent/offline";
import { validAttachment } from "@/lib/agent/extract.server";
import type { ChatTurn, TrackedApplication, UserProfile } from "@/lib/agent/types";

const LANGS: LangCode[] = ["en", "hi", "bn", "ta", "mr", "te", "gu", "kn"];

export async function POST(req: NextRequest) {
  // Protect the shared API credits: 60 requests per minute per client.
  const wait = rateLimit(`agent:${clientIp(req.headers)}`, [{ max: 60, windowMs: 60_000 }]);
  if (wait) return NextResponse.json({ success: false, error: `Too many requests. Try again in ${wait} seconds.` }, { status: 429, headers: { "Retry-After": String(wait) } });
  let body: {
    message?: string;
    lang?: LangCode;
    history?: ChatTurn[];
    profile?: UserProfile;
    applications?: TrackedApplication[];
    state?: OfflineState;
    attachment?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = String(body.message ?? "").slice(0, 2000);
  const lang = LANGS.includes(body.lang as LangCode) ? (body.lang as LangCode) : "hi";
  const profile = sanitizeProfile(body.profile);
  const applications = Array.isArray(body.applications) ? body.applications.slice(0, 50) : [];
  const history = Array.isArray(body.history) ? body.history.filter(t => t && typeof t.content === "string") : [];

  const attachment = validAttachment(body.attachment) ? body.attachment : undefined;

  const offline = () => runOfflineAgent({ message, lang, profile, state: body.state, applications });

  // Opening message is always the deterministic greeting + first question.
  const engine = activeEngine();
  if (engine === "offline" || !message || message === "__start__") {
    return NextResponse.json({ success: true, data: offline() });
  }

  try {
    const args = { history, message, lang, profile, applications, attachment };
    let data;
    try {
      data = engine === "claude" ? await runClaudeAgent(args) : await runSarvamAgent(args);
    } catch (err) {
      // Claude failing (bad key, outage) → try the free Sarvam engine before going offline.
      if (engine !== "claude" || !sarvamChatConfigured()) throw err;
      console.error("[agent] claude failed, trying sarvam:", (err as Error).message);
      data = await runSarvamAgent(args);
    }
    // Safety net: LLMs occasionally say "noted" without calling update_profile, or miss a fact.
    // The deterministic multilingual parser fills only fields the model left empty.
    const facts = Object.fromEntries(
      Object.entries(extractFacts(message)).filter(([k]) => data.profile[k as keyof UserProfile] === undefined),
    );
    if (Object.keys(facts).length) {
      data.profile = mergeProfile(data.profile, facts);
      data.toolCalls.push({ name: "update_profile", input: facts, summary: `Backup parser saved ${Object.keys(facts).join(", ")}` });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[agent] " + engine + " call failed, falling back to offline agent:", err);
    return NextResponse.json({ success: true, data: offline(), warning: "AI service unavailable — using offline agent" });
  }
}

export async function GET() {
  return NextResponse.json({ engine: activeEngine() });
}
