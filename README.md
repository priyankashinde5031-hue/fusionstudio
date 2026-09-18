# Fusion Studio

Next.js (App Router, TypeScript) + Supabase + Vercel.

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database / Auth:** Supabase (`@supabase/ssr`)
- **Hosting:** Vercel
- **Package manager:** npm

## Environments

| Environment | Git branch | Vercel target | Supabase project |
| ----------- | ---------- | ------------- | ---------------- |
| Local dev   | any        | —             | `fusion-studio-staging` (or local Supabase) |
| Staging     | `staging`  | Preview       | `fusion-studio-staging` |
| Production  | `main`     | Production    | `fusion-studio-prod` |

Two **separate Supabase projects** keep staging data fully isolated from
production. The same SQL migrations are applied to both to keep schemas identical.

## Local development

1. Copy env template and fill in your **staging** Supabase keys:
   ```bash
   cp .env.example .env.local
   # then edit .env.local
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
   App runs at http://localhost:3000

### Env vars

| Variable | Where | Notes |
| -------- | ----- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Never expose to the browser |
| `NEXT_PUBLIC_SITE_URL` | client + server | Base URL for redirects |

## Supabase client usage

- Client Components: `import { createClient } from "@/lib/supabase/client"`
- Server Components / Route Handlers / Server Actions: `import { createClient } from "@/lib/supabase/server"`
- Session refresh is handled by `src/middleware.ts`.

## Database migrations

```bash
supabase migration new <name>   # create a migration
supabase db reset               # rebuild LOCAL db from migrations
supabase link --project-ref <ref>   # link a remote project
supabase db push                # apply migrations to the linked remote project
```

Apply the same migrations to **staging first**, then production.

## Deployment (Vercel)

- Pushing to `staging` → Vercel Preview deploy (uses staging Supabase env vars).
- Pushing to `main` → Vercel Production deploy (uses production Supabase env vars).
- Set env vars per-environment in the Vercel dashboard (Project → Settings → Environment Variables).
