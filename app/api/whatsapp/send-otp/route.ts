import { NextRequest, NextResponse } from "next/server";
import { issueOtp } from "@/lib/server/otp.server";
import { getProvider } from "@/lib/server/notify.server";
import { normaliseMobile } from "@/lib/server/session.server";
import { asLang } from "@/lib/server/store.server";
import { clientIp, rateLimit } from "@/lib/server/ratelimit.server";
import { MSG, fill } from "@/lib/agent/i18n";

/**
 * Send a WhatsApp verification code. With a live provider (NOTIFY_PROVIDER) the code is random
 * and only delivered over WhatsApp; with the default console dry run nothing can reach the phone,
 * so the code is the fixed demo code 123456 and is returned in the response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mobile?: string; lang?: string };
    const mobile = normaliseMobile(body.mobile);
    if (!mobile) {
      return NextResponse.json({ success: false, error: "Valid 10-digit mobile number required" }, { status: 400 });
    }

    // Per number: 1 code / 30 s and 5 / hour (also stops resending to reset the wrong-guess counter).
    // Per IP: 20 / hour, so one client can't spray codes at many numbers.
    const wait =
      rateLimit(`otp:ip:${clientIp(req.headers)}`, [{ max: 20, windowMs: 3_600_000 }]) ||
      rateLimit(`otp:mobile:${mobile}`, [{ max: 1, windowMs: 30_000 }, { max: 5, windowMs: 3_600_000 }]);
    if (wait) {
      return NextResponse.json(
        { success: false, error: `Too many codes requested. Try again in ${wait} seconds.`, retryAfter: wait },
        { status: 429, headers: { "Retry-After": String(wait) } },
      );
    }

    const lang = asLang(body.lang);
    const provider = getProvider();
    const code = await issueOtp(mobile, !provider.live);
    const sent = await provider.send({ to: mobile, lang, kind: "otp", text: fill(MSG.otpMessage[lang], { code }), vars: [code] });
    if (!sent.ok) {
      console.error(`[whatsapp] OTP send via ${provider.name} failed: ${sent.error}`);
      return NextResponse.json({ success: false, error: "Could not send the code on WhatsApp" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to WhatsApp",
      ...(!provider.live && { debug_otp: code }),
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to send OTP" }, { status: 500 });
  }
}
