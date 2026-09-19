"use client";

import { useActionState } from "react";
import { loginStep, type LoginState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p
      className="text-sm rounded-lg px-3 py-2"
      role="alert"
      style={{
        color: "var(--color-danger)",
        background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
      }}
    >
      {error}
    </p>
  );
}

export default function CustomerLoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginStep, {
    step: "mobile",
  });

  const greeting = state.memberName ? `Hi ${state.memberName.split(" ")[0]},` : "Welcome";

  return (
    <div className="w-full max-w-sm mx-auto px-5 py-10">
      <div className="text-center mb-8">
        <div className="wordmark text-3xl">
          Fusion<span style={{ color: "var(--color-gold)" }}>Studio</span>
        </div>
        <div className="eyebrow mt-1" style={{ fontSize: "0.6rem" }}>
          Members
        </div>
      </div>

      {/* STEP: mobile */}
      {state.step === "mobile" && (
        <form action={formAction} className="panel p-6 flex flex-col gap-4">
          <input type="hidden" name="_intent" value="lookup" />
          <h1 className="display text-2xl">Sign in</h1>
          <p className="text-sm -mt-1" style={{ color: "var(--color-muted)" }}>
            Enter your mobile number to continue.
          </p>
          <div>
            <label className="label" htmlFor="mobile">
              Mobile number
            </label>
            <input
              id="mobile"
              name="mobile"
              inputMode="tel"
              autoComplete="tel"
              required
              className="input mono"
              placeholder="+91 98200 11223"
              defaultValue={state.mobile ?? ""}
            />
          </div>
          <ErrorNote error={state.error} />
          <SubmitButton className="btn btn-gold w-full" pendingText="Checking…">
            Continue
          </SubmitButton>
        </form>
      )}

      {/* STEP: OTP */}
      {state.step === "otp" && (
        <div className="panel p-6 flex flex-col gap-4">
          <h1 className="display text-2xl">{greeting}</h1>
          <p className="text-sm -mt-1" style={{ color: "var(--color-muted)" }}>
            Enter the 6-digit code we sent on WhatsApp to{" "}
            <span className="mono">{state.mobile}</span>.
          </p>

          {state.devCode && (
            <div
              className="text-xs rounded-lg px-3 py-2"
              style={{ background: "var(--color-gold-soft)", color: "var(--color-gold-bright)" }}
            >
              Dev mode — your code is <span className="mono font-bold">{state.devCode}</span>
            </div>
          )}
          {state.info && (
            <p className="text-xs" style={{ color: "var(--color-success)" }}>
              {state.info}
            </p>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="_intent" value="otp" />
            <input type="hidden" name="mobile" value={state.mobile ?? ""} />
            <div>
              <label className="label" htmlFor="code">
                Verification code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="input mono"
                style={{ letterSpacing: "0.35em", fontSize: "1.1rem" }}
                placeholder="000000"
                autoFocus
              />
            </div>
            <ErrorNote error={state.error} />
            <SubmitButton className="btn btn-gold w-full" pendingText="Verifying…">
              Verify
            </SubmitButton>
          </form>

          <form action={formAction} className="text-center">
            <input type="hidden" name="_intent" value="resend" />
            <input type="hidden" name="mobile" value={state.mobile ?? ""} />
            <button type="submit" className="text-xs" style={{ color: "var(--color-muted)" }}>
              Didn&apos;t get it? <span style={{ color: "var(--color-gold)" }}>Resend code</span>
            </button>
          </form>
        </div>
      )}

      {/* STEP: set PIN */}
      {state.step === "setpin" && (
        <form action={formAction} className="panel p-6 flex flex-col gap-4">
          <input type="hidden" name="_intent" value="setpin" />
          <input type="hidden" name="mobile" value={state.mobile ?? ""} />
          <h1 className="display text-2xl">Set a PIN</h1>
          <p className="text-sm -mt-1" style={{ color: "var(--color-muted)" }}>
            Choose a 4–6 digit PIN. You&apos;ll use it to sign in from now on.
          </p>
          <div>
            <label className="label" htmlFor="pin">
              New PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              required
              maxLength={6}
              className="input mono"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="label" htmlFor="pin_confirm">
              Confirm PIN
            </label>
            <input
              id="pin_confirm"
              name="pin_confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              required
              maxLength={6}
              className="input mono"
              placeholder="••••"
            />
          </div>
          <ErrorNote error={state.error} />
          <SubmitButton className="btn btn-gold w-full" pendingText="Saving…">
            Save PIN &amp; continue
          </SubmitButton>
        </form>
      )}

      {/* STEP: PIN login */}
      {state.step === "pin" && (
        <form action={formAction} className="panel p-6 flex flex-col gap-4">
          <input type="hidden" name="_intent" value="pin" />
          <input type="hidden" name="mobile" value={state.mobile ?? ""} />
          <h1 className="display text-2xl">{greeting}</h1>
          <p className="text-sm -mt-1" style={{ color: "var(--color-muted)" }}>
            Enter your PIN to sign in.
          </p>
          <div>
            <label className="label" htmlFor="pin">
              PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              required
              maxLength={6}
              className="input mono"
              placeholder="••••"
              autoFocus
            />
          </div>
          <ErrorNote error={state.error} />
          <SubmitButton className="btn btn-gold w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
