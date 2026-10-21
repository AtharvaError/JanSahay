import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/server/db.server";
import { getSessionMobile, maskMobile } from "@/lib/server/session.server";
import { getCitizen, setOptIn } from "@/lib/server/store.server";

/** Who is signed in, whether the server database is on, and whether they opted in to reminders. */
export async function GET() {
  const mobile = await getSessionMobile();
  if (!mobile) return NextResponse.json({ success: true, data: null });
  const db = await getDb().catch(() => null);
  const citizen = db ? await getCitizen(db, mobile) : null;
  return NextResponse.json({
    success: true,
    data: { mobile: maskMobile(mobile), serverSync: Boolean(db), optIn: citizen?.optIn ?? false },
  });
}

/** Change reminder consent for the signed-in citizen. */
export async function PATCH(req: NextRequest) {
  const mobile = await getSessionMobile();
  if (!mobile) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 });
  const db = await getDb();
  if (!db) return NextResponse.json({ success: false, error: "Server database is not configured" }, { status: 503 });
  const { optIn } = await req.json().catch(() => ({})) as { optIn?: boolean };
  await setOptIn(db, mobile, optIn === true);
  return NextResponse.json({ success: true, data: { optIn: optIn === true } });
}
