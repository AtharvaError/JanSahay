import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { consoleProvider, getProvider } from "@/lib/server/notify.server";
import { sendDueReminders } from "@/lib/server/reminders.server";

/**
 * Reminder sender — Vercel Cron calls GET with `Authorization: Bearer $CRON_SECRET` (see vercel.json).
 * Sends every follow-up due within the next 24 h, in the citizen's language, to citizens who opted in.
 *
 *   ?dryRun=1          use the console provider even if a real one is configured (nothing is marked sent)
 *   ?asOf=2026-11-01   pretend "now" is this date — dry run only, for testing
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  if (!db) return NextResponse.json({ success: false, error: "DATABASE_URL is not configured" }, { status: 503 });

  const params = req.nextUrl.searchParams;
  const asOfParam = params.get("asOf");
  const dryRun = params.get("dryRun") === "1" || asOfParam !== null;
  const asOf = asOfParam ? new Date(asOfParam) : new Date();
  if (Number.isNaN(+asOf)) return NextResponse.json({ success: false, error: "Bad asOf date" }, { status: 400 });

  const provider = dryRun ? consoleProvider : getProvider();
  const results = await sendDueReminders(db, provider, asOf);
  return NextResponse.json({
    success: true,
    provider: provider.name,
    dryRun: !provider.live,
    asOf: asOf.toISOString(),
    count: results.length,
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    reminders: results,
  });
}
