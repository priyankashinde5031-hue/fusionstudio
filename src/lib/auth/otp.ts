import "server-only";

/**
 * OTP delivery provider. Default channel is WhatsApp. Set OTP_PROVIDER=meta and
 * the WHATSAPP_* env vars to send real codes via the Meta WhatsApp Cloud API.
 */
export interface OtpSender {
  channel: "whatsapp" | "sms" | "stub";
  send(mobile: string, code: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * DEV STUB — doesn't actually send. Logs the code; in non-production the login
 * flow also surfaces it on screen so the OTP path is testable offline.
 */
const stubSender: OtpSender = {
  channel: "stub",
  async send(mobile, code) {
    console.log(`[OTP stub] would send WhatsApp code ${code} to ${mobile}`);
    return { ok: true };
  },
};

/**
 * Meta WhatsApp Cloud API sender using an approved AUTHENTICATION template.
 * The template must have a body with one variable (the code) and a one-tap
 * "copy code" URL button. Recipient number is sent as digits only.
 */
const metaSender: OtpSender = {
  channel: "whatsapp",
  async send(mobile, code) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const template = process.env.WHATSAPP_TEMPLATE_NAME || "otp_verification";
    const lang = process.env.WHATSAPP_TEMPLATE_LANG || "en";
    if (!phoneNumberId || !token) {
      return { ok: false, error: "WhatsApp not configured." };
    }

    const to = mobile.replace(/\D/g, ""); // e.g. 919876543210
    const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: lang },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("WhatsApp send failed", res.status, body);
        // TEMP: surface Meta's reason to help diagnose setup. Revert to a
        // generic message once WhatsApp sending is confirmed working.
        let detail = body;
        try {
          const j = JSON.parse(body);
          detail = `${j.error?.code ?? res.status}: ${j.error?.message ?? "error"}${
            j.error?.error_data?.details ? ` — ${j.error.error_data.details}` : ""
          }`;
        } catch {
          /* keep raw body */
        }
        return { ok: false, error: `WhatsApp send failed [${detail}]`.slice(0, 300) };
      }
      return { ok: true };
    } catch (e) {
      console.error("WhatsApp send error", e);
      return { ok: false, error: `WhatsApp network error: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200) };
    }
  },
};

export function getOtpSender(): OtpSender {
  switch (process.env.OTP_PROVIDER) {
    case "meta":
      return metaSender;
    default:
      return stubSender;
  }
}

/** True when the dev stub is active (no real provider configured). */
export function isStubOtp(): boolean {
  return process.env.OTP_PROVIDER !== "meta";
}
