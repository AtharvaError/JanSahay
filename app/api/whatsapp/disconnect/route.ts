import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { clearSession, getSessionMobile } from "@/lib/server/session.server";
import { setOptIn } from "@/lib/server/store.server";

/** Withdraw reminder consent and sign out. Data already synced stays until the citizen deletes it. */
export async function POST() {
  const mobile = await getSessionMobile();
  const db = await getDb().catch(() => null);
  if (mobile && db) await setOptIn(db, mobile, false);
  await clearSession();
  return NextResponse.json({ success: true });
}
