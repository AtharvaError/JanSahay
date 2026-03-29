import { NextRequest, NextResponse } from "next/server";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { mobile, otp } = await req.json() as { mobile: string; otp: string };

    if (!mobile || !otp) {
      return NextResponse.json({ success: false, error: "Mobile and OTP required" }, { status: 400 });
    }

    // For demo: accept any OTP where mock code is "123456" or stored matches
    const stored = otpStore.get(mobile);
    const isValid = otp === "123456" || (stored && stored.otp === otp && stored.expiresAt > Date.now());

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid or expired OTP" }, { status: 401 });
    }

    otpStore.delete(mobile);

    // In production: update user record, store whatsapp_connected: true, mobile
    return NextResponse.json({
      success: true,
      message: "WhatsApp connected successfully",
      data: {
        mobile,
        connectedAt: new Date().toISOString(),
        features: ["deadline_alerts", "status_updates", "ai_guidance", "scheme_discovery"],
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
