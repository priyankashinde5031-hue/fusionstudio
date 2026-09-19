import "server-only";

/**
 * OTP delivery provider. Default channel is WhatsApp. Swap in a real provider
 * (Gupshup / Twilio / MSG91 WhatsApp) by setting OTP_PROVIDER + its keys.
 */
export interface OtpSender {
  channel: "whatsapp" | "sms" | "stub";
  send(mobile: string, code: string): Promise<{ ok: boolean; error?: string }>;
}

/**
 * DEV STUB — doesn't actually send. Logs the code and (in non-production) the
 * flow surfaces it on screen so the full OTP path is testable offline.
 * TODO: add the real WhatsApp provider and select it via OTP_PROVIDER.
 */
const stubSender: OtpSender = {
  channel: "stub",
  async send(mobile, code) {
    console.log(`[OTP stub] would send WhatsApp code ${code} to ${mobile}`);
    return { ok: true };
  },
};

// Example real provider scaffold (left unwired until keys exist):
// async function gupshupWhatsApp(mobile, code) { ... fetch Gupshup API ... }

export function getOtpSender(): OtpSender {
  switch (process.env.OTP_PROVIDER) {
    // case "gupshup": return gupshupSender;
    // case "twilio": return twilioSender;
    default:
      return stubSender;
  }
}

/** True when the dev stub is active (no real provider configured). */
export function isStubOtp(): boolean {
  return !process.env.OTP_PROVIDER;
}
