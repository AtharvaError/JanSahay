import { NextRequest, NextResponse } from "next/server";
import type { LangCode } from "@/lib/translations";
import { claudeConfigured, runClaudeAgent } from "@/lib/agent/claude";
import { runOfflineAgent, type OfflineState } from "@/lib/agent/offline";
import type { ChatTurn, TrackedApplication, UserProfile } from "@/lib/agent/types";

const LANGS: LangCode[] = ["en", "hi", "bn", "ta", "mr", "te", "gu", "kn"];

export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    lang?: LangCode;
    history?: ChatTurn[];
    profile?: UserProfile;
    applications?: TrackedApplication[];
    state?: OfflineState;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = String(body.message ?? "").slice(0, 2000);
  const lang = LANGS.includes(body.lang as LangCode) ? (body.lang as LangCode) : "hi";
  const profile = body.profile ?? {};
  const applications = Array.isArray(body.applications) ? body.applications.slice(0, 50) : [];
  const history = Array.isArray(body.history) ? body.history.filter(t => t && typeof t.content === "string") : [];

  const offline = () => runOfflineAgent({ message, lang, profile, state: body.state, applications });

  // Opening message is always the deterministic greeting + first question.
  if (!claudeConfigured() || !message || message === "__start__") {
    return NextResponse.json({ success: true, data: offline() });
  }

  try {
    const data = await runClaudeAgent({ history, message, lang, profile, applications });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[agent] Claude call failed, falling back to offline agent:", err);
    return NextResponse.json({ success: true, data: offline(), warning: "AI service unavailable — using offline agent" });
  }
}

export async function GET() {
  return NextResponse.json({ engine: claudeConfigured() ? "claude" : "offline" });
}
