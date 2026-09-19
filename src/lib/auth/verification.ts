import "server-only";

/**
 * Method A — OTP-less mobile verification (WhatsApp / Truecaller), the
 * verification + recovery rail from SPEC §4. Swappable by config.
 *
 * The everyday login rail is Mobile + PIN (method C), handled in the member
 * auth actions. This provider only proves number ownership at registration /
 * PIN reset, which is what makes the PIN trustworthy.
 */
export interface VerificationProvider {
  /** Kick off a one-tap verification for a mobile (send WhatsApp / Truecaller prompt). */
  startVerification(mobile: string): Promise<{ ok: boolean; error?: string }>;
  /** Confirm the verification. `token` is the provider's proof (unused by the stub). */
  confirmVerification(
    mobile: string,
    token?: string,
  ): Promise<{ ok: boolean; error?: string }>;
}

/**
 * DEV STUB — auto-passes so the PIN flow is fully testable offline.
 * TODO: replace with the real OTPless / Truecaller SDK provider and select it
 * via AUTH_PROVIDER once SDK keys are configured.
 */
const stubProvider: VerificationProvider = {
  async startVerification() {
    return { ok: true };
  },
  async confirmVerification() {
    return { ok: true };
  },
};

export function getVerificationProvider(): VerificationProvider {
  switch (process.env.AUTH_PROVIDER) {
    // case "otpless": return otplessProvider;  // TODO
    // case "truecaller": return truecallerProvider;  // TODO
    default:
      return stubProvider;
  }
}

/** True when the auto-pass stub is active (dev). Used to hint the UI. */
export function isStubVerification(): boolean {
  return !process.env.AUTH_PROVIDER;
}
