import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyDraft } from "@/lib/agent/tools.server";
import type { ApplicationDraft, DraftField, TrackedApplication } from "@/lib/agent/types";
import { MSG } from "@/lib/agent/i18n";
import type { LangCode } from "@/lib/translations";
import { getDb } from "@/lib/server/db.server";
import { getSessionMobile } from "@/lib/server/session.server";
import { saveApplication, upsertCitizen } from "@/lib/server/store.server";

/**
 * Submit an application. This is the ONLY way an application gets submitted, and it
 * requires (1) a draft signed by the prefill tool and (2) an explicit human confirmation
 * flag that is only sent when the citizen presses "Confirm & Submit" in the review card.
 * The agent has no tool that can call this endpoint.
 */
export async function POST(req: NextRequest) {
  let body: { draft?: ApplicationDraft; fields?: DraftField[]; confirmedByUser?: boolean; lang?: LangCode };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { draft, fields, confirmedByUser } = body;
  if (confirmedByUser !== true) {
    return NextResponse.json(
      { success: false, error: "Human confirmation required before submission." },
      { status: 403 },
    );
  }
  if (!draft || !verifyDraft(draft)) {
    return NextResponse.json({ success: false, error: "Unknown or tampered draft." }, { status: 400 });
  }

  const finalFields = (Array.isArray(fields) ? fields : draft.fields).map(f => ({
    field: String(f.field).slice(0, 120),
    value: String(f.value ?? "").slice(0, 200).trim(),
    source: f.source,
    hint: String(f.hint ?? "").slice(0, 300),
  }));
  const empty = finalFields.filter(f => !f.value).map(f => f.field);
  if (empty.length) {
    return NextResponse.json({ success: false, error: "Some fields are still empty.", missing: empty }, { status: 422 });
  }

  const lang: LangCode = body.lang && body.lang in MSG.fuCheckStatus ? body.lang : "en";
  const now = new Date();
  const day = 86400000;
  const app: TrackedApplication = {
    referenceId: `JS-${now.getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    draftId: draft.draftId,
    schemeId: draft.schemeId,
    title: draft.title,
    icon: draft.icon,
    portalUrl: draft.portalUrl,
    fields: finalFields,
    submittedAt: now.toISOString(),
    confirmedByUser: true,
    status: "submitted",
    timeline: [{ status: "submitted", at: now.toISOString(), note: "Submitted after citizen reviewed and confirmed all fields" }],
    followUps: [
      { id: `FU-${randomUUID().slice(0, 6)}`, title: MSG.fuCheckStatus[lang], dueDate: new Date(+now + 7 * day).toISOString(), done: false },
      { id: `FU-${randomUUID().slice(0, 6)}`, title: MSG.fuCheckDbt[lang], dueDate: new Date(+now + 30 * day).toISOString(), done: false },
    ],
  };

  // Signed-in (WhatsApp-verified) citizens also get the application and its follow-ups stored
  // server-side so reminders can reach them. Device-only users keep it in localStorage.
  let stored = false;
  const mobile = await getSessionMobile();
  if (mobile) {
    try {
      const db = await getDb();
      if (db) {
        await upsertCitizen(db, mobile, { lang });
        await saveApplication(db, mobile, app);
        stored = true;
      }
    } catch (e) {
      console.error("[applications] could not persist", e);
    }
  }
  return NextResponse.json({ success: true, data: app, stored });
}
