import type { Db } from "./db.server";
import type { DraftField, FollowUp, TrackedApplication, UserProfile } from "@/lib/agent/types";
import type { LangCode } from "@/lib/translations";

// Server-side persistence for a verified citizen. Every write is scoped to the session mobile,
// and identity numbers are reduced to their last 4 digits before they reach the database.

const LANGS: LangCode[] = ["en", "hi", "bn", "ta", "mr", "te", "gu", "kn"];
export const asLang = (l: unknown): LangCode => (LANGS.includes(l as LangCode) ? (l as LangCode) : "hi");

const last4 = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d ? d.slice(-4) : null;
};

/** Mask any Aadhaar / bank-account-like digit run (9+ digits, spaces or dashes allowed) to XXXX1234. */
export const maskIds = (v: string) =>
  v.replace(/\d[\d\s-]{7,}\d/g, run => {
    const d = run.replace(/\D/g, "");
    return d.length >= 9 ? `XXXX${d.slice(-4)}` : run;
  });

const cleanFields = (fields: DraftField[]) =>
  fields.slice(0, 60).map(f => ({ ...f, value: maskIds(String(f.value ?? "")).slice(0, 200) }));

export async function upsertCitizen(db: Db, mobile: string, opts: { lang?: LangCode; profile?: UserProfile } = {}) {
  const now = new Date().toISOString();
  const p = opts.profile ?? {};
  await db.query(
    `INSERT INTO citizens (mobile, name, lang, state, district, aadhaar_last4, bank_last4, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     ON CONFLICT (mobile) DO UPDATE SET
       name = COALESCE(excluded.name, citizens.name),
       lang = COALESCE(CAST($9 AS TEXT), citizens.lang),
       state = COALESCE(excluded.state, citizens.state),
       district = COALESCE(excluded.district, citizens.district),
       aadhaar_last4 = COALESCE(excluded.aadhaar_last4, citizens.aadhaar_last4),
       bank_last4 = COALESCE(excluded.bank_last4, citizens.bank_last4),
       updated_at = excluded.updated_at`,
    [
      mobile, p.name?.slice(0, 120) ?? null, opts.lang ?? "hi", p.state ?? null, p.district ?? null,
      last4(p.aadhaarLast4), last4(p.bankAccountLast4), now, opts.lang ?? null,
    ],
  );
}

export async function setOptIn(db: Db, mobile: string, optIn: boolean) {
  await db.query(
    `UPDATE citizens SET whatsapp_opt_in = $2, opted_in_at = $3, updated_at = $4 WHERE mobile = $1`,
    [mobile, optIn ? 1 : 0, optIn ? new Date().toISOString() : null, new Date().toISOString()],
  );
}

export async function getCitizen(db: Db, mobile: string) {
  const [row] = await db.query<{ lang: string; whatsapp_opt_in: number; opted_in_at: string | null }>(
    `SELECT lang, whatsapp_opt_in, opted_in_at FROM citizens WHERE mobile = $1`, [mobile],
  );
  return row ? { lang: asLang(row.lang), optIn: Number(row.whatsapp_opt_in) === 1, optedInAt: row.opted_in_at } : null;
}

export async function saveFollowUps(db: Db, mobile: string, items: FollowUp[], referenceId: string | null) {
  for (const f of items.slice(0, 200)) {
    if (!f?.id || !f.dueDate || Number.isNaN(Date.parse(f.dueDate))) continue;
    // `done` comes from the citizen's device; `sent_at` is owned by the reminder sender and never overwritten.
    await db.query(
      `INSERT INTO follow_ups (id, mobile, reference_id, title, due_date, done, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET done = excluded.done, title = excluded.title, due_date = excluded.due_date
       WHERE follow_ups.mobile = excluded.mobile`,
      [String(f.id).slice(0, 64), mobile, referenceId, maskIds(String(f.title)).slice(0, 300), new Date(f.dueDate).toISOString(), f.done ? 1 : 0, new Date().toISOString()],
    );
  }
}

export async function saveApplication(db: Db, mobile: string, app: TrackedApplication) {
  await db.query(
    `INSERT INTO applications (reference_id, mobile, scheme_id, title, icon, portal_url, status, fields_json, timeline_json, submitted_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (reference_id) DO UPDATE SET status = excluded.status, timeline_json = excluded.timeline_json, updated_at = excluded.updated_at
     WHERE applications.mobile = excluded.mobile`,
    [
      String(app.referenceId).slice(0, 64), mobile, String(app.schemeId).slice(0, 64), String(app.title).slice(0, 200),
      app.icon ?? null, app.portalUrl ?? null, app.status, JSON.stringify(cleanFields(app.fields ?? [])),
      JSON.stringify((app.timeline ?? []).slice(0, 50)), app.submittedAt, new Date().toISOString(),
    ],
  );
  await saveFollowUps(db, mobile, app.followUps ?? [], app.referenceId);
}

type AppRow = {
  reference_id: string; scheme_id: string; title: string; icon: string | null; portal_url: string | null;
  status: TrackedApplication["status"]; fields_json: string; timeline_json: string; submitted_at: string;
};
type FuRow = { id: string; reference_id: string | null; title: string; due_date: string; done: number };

/** Everything stored for this citizen, in the same shapes the client keeps in localStorage. */
export async function loadCitizenData(db: Db, mobile: string) {
  const apps = await db.query<AppRow>(`SELECT * FROM applications WHERE mobile = $1 ORDER BY submitted_at DESC`, [mobile]);
  const fus = await db.query<FuRow>(`SELECT id, reference_id, title, due_date, done FROM follow_ups WHERE mobile = $1 ORDER BY due_date`, [mobile]);
  const toFu = (r: FuRow): FollowUp => ({ id: r.id, title: r.title, dueDate: r.due_date, done: Number(r.done) === 1 });
  const applications: TrackedApplication[] = apps.map(a => ({
    referenceId: a.reference_id, draftId: "", schemeId: a.scheme_id, title: a.title, icon: a.icon ?? "📄",
    portalUrl: a.portal_url ?? "", fields: JSON.parse(a.fields_json), submittedAt: a.submitted_at, confirmedByUser: true,
    status: a.status, timeline: JSON.parse(a.timeline_json),
    followUps: fus.filter(f => f.reference_id === a.reference_id).map(toFu),
  }));
  return { applications, followUps: fus.filter(f => !f.reference_id).map(toFu) };
}
