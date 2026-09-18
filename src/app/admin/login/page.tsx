"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

export default function AdminLoginPage() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="eyebrow mb-3">Staff access</div>
          <h1 className="display text-4xl">
            Fusion<span style={{ color: "var(--color-gold)" }}>Studio</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
            Admin dashboard
          </p>
        </div>

        <form action={formAction} className="panel p-6 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="input"
              placeholder="you@fusionstudio.in"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{
                color: "var(--color-danger)",
                background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 35%, transparent)",
              }}
              role="alert"
            >
              {state.error}
            </p>
          )}

          <SubmitButton className="btn btn-gold w-full mt-1" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
