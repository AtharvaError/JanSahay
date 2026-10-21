import { NextRequest, NextResponse } from "next/server";
import { executeTool, type ToolContext } from "@/lib/agent/tools.server";
import type { UserProfile } from "@/lib/agent/types";

// Same prefill tool the agent uses, exposed for the step-by-step application wizard.
export async function POST(req: NextRequest) {
  let body: { schemeId?: string; profile?: UserProfile };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const ctx: ToolContext = { profile: body.profile ?? {}, applications: [], artifacts: {}, traces: [] };
  const result = executeTool("prefill_application_form", { scheme_id: String(body.schemeId ?? "") }, ctx);
  if (!ctx.artifacts.draft) return NextResponse.json({ success: false, error: result }, { status: 404 });
  return NextResponse.json({ success: true, data: ctx.artifacts.draft });
}
