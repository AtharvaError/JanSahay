import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";

// In-memory OTP store — use Redis in production
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { mobile, lang } = await req.json() as { mobile: string; lang?: string };

    if (!mobile || mobile.length < 10) {
      return NextResponse.json({ success: false, error: "Valid mobile number required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = "123456"; // Fixed for demo; use randomInt(100000, 999999).toString() in production
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(mobile, { otp, expiresAt });

    // In production: call WhatsApp Business API (Meta) or Twilio/MSG91
    // Example: POST https://graph.facebook.com/v18.0/{phone_id}/messages
    // with template: { to: "+91" + mobile, type: "template", template: { name: "otp_message", language: { code: lang || "en" } } }

    console.log(`[WhatsApp OTP] Sent OTP ${otp} to +91${mobile} in lang: ${lang ?? "en"}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent to WhatsApp",
      // Only expose in dev for demo purposes:
      ...(process.env.NODE_ENV === "development" && { debug_otp: otp }),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to send OTP" }, { status: 500 });
  }
}
