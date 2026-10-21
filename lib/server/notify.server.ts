import type { LangCode } from "@/lib/translations";

// ─── Pluggable outbound messaging ────────────────────────────────────────────
// NOTIFY_PROVIDER = console (default, dry run) | whatsapp (Meta Cloud API) | twilio | msg91.
// Every provider gets the fully rendered text in the citizen's language plus the template
// variables, because WhatsApp only allows business-initiated messages through approved templates.

export interface OutboundMessage {
  to: string;          // 10-digit Indian mobile
  lang: LangCode;
  kind: "otp" | "reminder";
  text: string;        // rendered message in `lang`
  vars: string[];      // template body parameters ({{1}}, {{2}}, …)
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface MessageProvider {
  name: string;
  live: boolean; // false → nothing actually leaves the server
  send(msg: OutboundMessage): Promise<SendResult>;
}

const env = (k: string) => process.env[k]?.trim() || undefined;

export const consoleProvider: MessageProvider = {
  name: "console",
  live: false,
  async send(msg) {
    console.log(`[notify:dry-run] ${msg.kind} → +91${msg.to} (${msg.lang}): ${msg.text}`);
    return { ok: true, id: `dry-${Date.now()}` };
  },
};

/** Meta WhatsApp Business Cloud API. */
function whatsappCloud(): MessageProvider {
  const token = env("WHATSAPP_TOKEN");
  const phoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) throw new Error("WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required");
  return {
    name: "whatsapp",
    live: true,
    async send(msg) {
      const template = env(msg.kind === "otp" ? "WHATSAPP_OTP_TEMPLATE" : "WHATSAPP_REMINDER_TEMPLATE");
      const params = msg.vars.map(text => ({ type: "text", text }));
      const body = template
        ? {
            messaging_product: "whatsapp", to: `91${msg.to}`, type: "template",
            template: {
              name: template, language: { code: msg.lang },
              components: [
                { type: "body", parameters: params },
                // Authentication templates carry the code again on their copy-code button.
                ...(msg.kind === "otp" ? [{ type: "button", sub_type: "url", index: "0", parameters: params.slice(0, 1) }] : []),
              ],
            },
          }
        // Free-form text is only delivered inside the 24-hour customer-service window.
        : { messaging_product: "whatsapp", to: `91${msg.to}`, type: "text", text: { body: msg.text } };
      const res = await fetch(`https://graph.facebook.com/${env("WHATSAPP_API_VERSION") ?? "v21.0"}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return res.ok ? { ok: true, id: json.messages?.[0]?.id } : { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    },
  };
}

/** Twilio Programmable Messaging over the WhatsApp channel. */
function twilio(): MessageProvider {
  const sid = env("TWILIO_ACCOUNT_SID");
  const auth = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_WHATSAPP_FROM"); // e.g. whatsapp:+14155238886
  if (!sid || !auth || !from) throw new Error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM are required");
  return {
    name: "twilio",
    live: true,
    async send(msg) {
      const form = new URLSearchParams({ From: from, To: `whatsapp:+91${msg.to}`, Body: msg.text });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${sid}:${auth}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      return res.ok ? { ok: true, id: json.sid } : { ok: false, error: json.message ?? `HTTP ${res.status}` };
    },
  };
}

/** MSG91 WhatsApp outbound (template messages). */
function msg91(): MessageProvider {
  const authkey = env("MSG91_AUTH_KEY");
  const number = env("MSG91_WHATSAPP_NUMBER");
  if (!authkey || !number) throw new Error("MSG91_AUTH_KEY and MSG91_WHATSAPP_NUMBER are required");
  return {
    name: "msg91",
    live: true,
    async send(msg) {
      const template = env(msg.kind === "otp" ? "MSG91_OTP_TEMPLATE" : "MSG91_REMINDER_TEMPLATE");
      if (!template) return { ok: false, error: `MSG91_${msg.kind.toUpperCase()}_TEMPLATE is not set` };
      const components = Object.fromEntries(msg.vars.map((v, i) => [`body_${i + 1}`, { type: "text", value: v }]));
      const res = await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
        method: "POST",
        headers: { authkey, "Content-Type": "application/json" },
        body: JSON.stringify({
          integrated_number: number,
          content_type: "template",
          payload: {
            messaging_product: "whatsapp", type: "template",
            template: { name: template, language: { code: msg.lang, policy: "deterministic" }, to_and_components: [{ to: [`91${msg.to}`], components }] },
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      return res.ok && json.status !== "fail" ? { ok: true, id: json.request_id } : { ok: false, error: json.errors ?? json.message ?? `HTTP ${res.status}` };
    },
  };
}

/** The configured provider; falls back to the console dry run if it is misconfigured. */
export function getProvider(): MessageProvider {
  const name = (env("NOTIFY_PROVIDER") ?? "console").toLowerCase();
  try {
    if (name === "whatsapp") return whatsappCloud();
    if (name === "twilio") return twilio();
    if (name === "msg91") return msg91();
  } catch (e) {
    console.warn(`[notify] ${name} not configured (${(e as Error).message}); using console dry run`);
  }
  return consoleProvider;
}
