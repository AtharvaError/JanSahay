import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { getSessionMobile } from "@/lib/server/session.server";
import { asLang, loadCitizenData, saveApplication, saveFollowUps, upsertCitizen } from "@/lib/server/store.server";
import type { FollowUp, TrackedApplication, UserProfile } from "@/lib/agent/types";

// Two-way sync between the device's localStorage and the server, for a WhatsApp-verified citizen.
// Without DATABASE_URL this answers { enabled: false } and the app stays device-only.

async function context() {
  const mobile = await getSessionMobile();
  if (!mobile) return { error: NextResponse.json({ success: false, error: "Verify your mobile on WhatsApp first" }, { status: 401 }) };
  const db = await getDb();
  if (!db) return { error: NextResponse.json({ success: true, enabled: false }) };
  return { mobile, db };
}

export async function GET() {
  const c = await context();
  if (c.error) return c.error;
  return NextResponse.json({ success: true, enabled: true, data: await loadCitizenData(c.db, c.mobile) });
}

export async function POST(req: NextRequest) {
  const c = await context();
  if (c.error) return c.error;
  let body: { profile?: UserProfile; applications?: TrackedApplication[]; followUps?: FollowUp[]; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  await upsertCitizen(c.db, c.mobile, { profile: body.profile, lang: body.lang ? asLang(body.lang) : undefined });
  for (const app of (Array.isArray(body.applications) ? body.applications : []).slice(0, 100)) {
    if (app?.referenceId && app.submittedAt && app.confirmedByUser === true) await saveApplication(c.db, c.mobile, app);
  }
  await saveFollowUps(c.db, c.mobile, Array.isArray(body.followUps) ? body.followUps : [], null);
  return NextResponse.json({ success: true, enabled: true, data: await loadCitizenData(c.db, c.mobile) });
}
