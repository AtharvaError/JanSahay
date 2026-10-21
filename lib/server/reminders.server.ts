import type { Db } from "./db.server";
import { asLang } from "./store.server";
import { maskMobile } from "./session.server";
import type { MessageProvider } from "./notify.server";
import { MSG, fill } from "@/lib/agent/i18n";

// Finds follow-ups that are due (or due within the next day) for citizens who opted in to
// WhatsApp reminders, renders each in the citizen's language and hands it to the provider.

const MAX_ATTEMPTS = 3;
const LOOKAHEAD_MS = 24 * 3600 * 1000;

type DueRow = {
  id: string; mobile: string; lang: string; title: string; due_date: string;
  reference_id: string | null; scheme_title: string | null;
};

export async function findDueReminders(db: Db, asOf: Date, limit = 100) {
  const rows = await db.query<DueRow>(
    `SELECT f.id, f.mobile, c.lang, f.title, f.due_date, f.reference_id, a.title AS scheme_title
     FROM follow_ups f
     JOIN citizens c ON c.mobile = f.mobile
     LEFT JOIN applications a ON a.reference_id = f.reference_id
     WHERE f.done = 0 AND f.sent_at IS NULL AND f.attempts < $1
       AND c.whatsapp_opt_in = 1
       AND f.due_date <= $2
     ORDER BY f.due_date
     LIMIT $3`,
    [MAX_ATTEMPTS, new Date(+asOf + LOOKAHEAD_MS).toISOString(), limit],
  );
  return rows.map(r => {
    const lang = asLang(r.lang);
    const date = new Date(r.due_date).toLocaleDateString(`${lang}-IN`, { day: "numeric", month: "long", year: "numeric" });
    const scheme = r.scheme_title ? ` (${r.scheme_title}${r.reference_id ? `, ${r.reference_id}` : ""})` : "";
    return {
      id: r.id,
      mobile: r.mobile,
      lang,
      dueDate: r.due_date,
      text: fill(MSG.reminder[lang], { task: r.title, scheme, date }),
      vars: [r.title + scheme, date],
    };
  });
}

export async function sendDueReminders(db: Db, provider: MessageProvider, asOf: Date) {
  const due = await findDueReminders(db, asOf);
  const results = [];
  for (const r of due) {
    const res = await provider.send({ to: r.mobile, lang: r.lang, kind: "reminder", text: r.text, vars: r.vars })
      .catch((e: Error) => ({ ok: false, error: e.message, id: undefined }));
    // A dry run leaves the row untouched so the same reminder is picked up once a real provider is set.
    if (provider.live) {
      await db.query(
        res.ok
          ? `UPDATE follow_ups SET sent_at = $2, attempts = attempts + 1, last_error = NULL WHERE id = $1`
          : `UPDATE follow_ups SET attempts = attempts + 1, last_error = $2 WHERE id = $1`,
        [r.id, res.ok ? new Date().toISOString() : String(res.error).slice(0, 500)],
      );
    }
    results.push({ id: r.id, to: maskMobile(r.mobile), lang: r.lang, dueDate: r.dueDate, text: r.text, ok: res.ok, error: res.error });
  }
  return results;
}
