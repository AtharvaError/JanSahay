import { NextRequest, NextResponse } from "next/server";
import { checkOtp } from "@/lib/server/otp.server";
import { getDb } from "@/lib/server/db.server";
import { maskMobile, normaliseMobile, setSession } from "@/lib/server/session.server";
import { asLang, setOptIn, upsertCitizen } from "@/lib/server/store.server";

/**
 * Verify the code, then sign the citizen in (httpOnly session cookie keyed by the verified mobile).
 * `optIn` records the explicit consent ticked on the connect screen; reminders are never sent without it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mobile?: string; otp?: string; optIn?: boolean; lang?: string };
    const mobile = normaliseMobile(body.mobile);
    if (!mobile || !body.otp) {
      return NextResponse.json({ success: false, error: "Mobile and OTP required" }, { status: 400 });
    }
    if (!(await checkOtp(mobile, String(body.otp)))) {
      return NextResponse.json({ success: false, error: "Invalid or expired OTP" }, { status: 401 });
    }

    await setSession(mobile);
    const optIn = body.optIn === true;
    const db = await getDb();
    if (db) {
      await upsertCitizen(db, mobile, { lang: asLang(body.lang) });
      await setOptIn(db, mobile, optIn);
    }

    return NextResponse.json({
      success: true,
      message: "WhatsApp connected successfully",
      data: { mobile: maskMobile(mobile), connectedAt: new Date().toISOString(), optIn: Boolean(db) && optIn, serverSync: Boolean(db) },
    });
  } catch (e) {
    console.error("[whatsapp] verify failed", e);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
