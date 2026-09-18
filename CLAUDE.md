@AGENTS.md

# Fusion Studio

Salon membership + coupon platform. Admin dashboard (desktop) + customer PWA (mobile-first).
Product brief lives in `SPEC.md` — build in its phases, pause for review after each.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (tokens in `src/app/globals.css` `@theme`)
- Supabase Postgres (two projects: staging / prod). DB access is **server-only via the service role** (`src/lib/supabase/admin.ts`); RLS is on with no policies, so the anon key can't read anything.
- Custom auth: admins = email + password (bcrypt) → JWT cookie (`src/lib/auth`). Members = mobile + PIN (Phase 3).

## Commands

- `npm run dev` — local dev (http://localhost:3000)
- `npm run build` — production build (run before committing UI work)
- `npm run seed` — seed the linked/staging DB (admin, tiers, coupons, members)
- `supabase migration new <name>` → edit SQL → `supabase db push` (staging linked). Promote to prod by re-linking.

## Conventions

- India: `+91` 10-digit mobiles (6–9 start), `₹`, `DD/MM/YYYY`, **all time math in IST** — use `src/lib/format.ts`.
- Never hard-delete members/cards/coupons — soft-delete/deactivate + write to `audit_log` (`src/lib/audit.ts`).
- Mutations = Server Actions in a route's `actions.ts`; validate with zod (`src/lib/validation.ts`).
- This Next.js renamed `middleware` → `proxy` (`src/proxy.ts`). Heed AGENTS.md deprecation notes.
- Design: matte black + champagne gold. Use the component classes in `globals.css` (`.panel`, `.btn`, `.input`, `.chip`, `.display`) — not raw Tailwind card looks.
