# KIA Schemes — AI Scheme of Work Generator

Generate professional Schemes of Work for Ugandan secondary schools. Teachers fill a
questionnaire, AI completes learning outcomes/resources/methodology, and the app
previews + exports a landscape A4 PDF.

Stack: React + Vite frontend, Express API (`server/`) backed by Neon Postgres,
Neon Auth (Managed Better Auth) for login, OpenRouter for AI generation.

## Quick start

```sh
npm install
npm install --prefix server
```

Backend env (`server/.env`, see `server/.env.example`):

```sh
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
OPENROUTER_API_KEY="..."
OPENROUTER_MODEL=openrouter/free
PORT=4000
AUTH_JWKS_URL="https://ep-xxx.neonauth....neon.tech/neondb/auth/.well-known/jwks.json"
AUTH_ISSUER=""
# Optional hardening:
CORS_ORIGIN="https://your-app.example.com"   # comma-separated allowlist; empty = same-origin only
TRUST_PROXY=1                                # set when behind a reverse proxy (Render/Railway/Nginx)
```

Never commit real secrets — only `.env` / `server/.env` (both git-ignored) hold them.

Frontend env (`.env`, see `.env.example`): set `VITE_NEON_AUTH_URL` to your Neon
Auth base URL (Neon Console → Auth → Configuration). `VITE_API_URL` is only needed
if the API is hosted separately — same-origin works by default.

Run both (in two terminals):

```sh
npm run dev                  # frontend on :8080, proxies /api → :4000
npm run dev --prefix server  # API on :4000
```

## Authentication (Neon Auth)

- Sign-in/sign-up page at `/login` (email + password, plus Google if configured
  in Neon Console). Neon Auth (Managed Better Auth) is enabled on the
  `KIA-SCHEME-GENIE` production branch; users sync to `neon_auth.user`.
- `/create` and `/preview` are gated by `RequireAuth` — visitors are redirected
  to `/login` unless signed in.
- The API verifies session JWTs server-side on all `/api/schemes` routes against
  the branch JWKS endpoint (`AUTH_JWKS_URL`), returning `401` without a valid
  Bearer token.
- Saved schemes record `user_id` / `user_email` in `public.schemes`.

## Security

- **Secrets:** `DATABASE_URL`, `OPENROUTER_API_KEY`, and `AUTH_JWKS_URL` live only in
  `server/.env` (git-ignored). Only the Neon Auth base URL is exposed to the browser
  (`VITE_NEON_AUTH_URL`) — the API key and DB password are never bundled into `dist/`
  (verified: no `sk-or-v1-`, `npg_`, or JWT strings in tracked files or build output).
- **Auth on every route:** all `/api/schemes` routes require a valid Neon Auth session
  JWT, verified server-side against the branch JWKS endpoint. Generation cannot be
  bypassed without a token.
- **Rate limiting:** a global 120 req/min/IP limiter plus a 10 AI generations/hour/user
  cap protect the OpenRouter quota. Set `TRUST_PROXY=1` behind a proxy so limits key on
  the real client IP.
- **CORS:** restricted to an explicit `CORS_ORIGIN` allowlist (empty = same-origin).
- **Rotate any key that has ever been committed to git history** (Supabase, OpenRouter,
  Neon). Git history cannot be scrubbed from the remote without a force-push.

## Scripts

- `npm run dev` — frontend dev server
- `npm run build` — typecheck + production build (`dist/`)
- `npm run preview` — preview the production build
- `npm test` — run Vitest suite
- `npm run lint` / `npm run typecheck`
- `npm run dev --prefix server` — API dev server (tsx watch)
- `npm run build --prefix server` / `npm start --prefix server` — API prod build/start

## API + Neon

- `POST /api/schemes/generate` — AI-generate rows from `formData` (OpenRouter).
- `POST /api/schemes` — save a generated scheme to Neon (`public.schemes`).
- `GET /api/schemes` — list recent schemes (50).
- `GET /api/schemes/:id` — fetch one scheme.
- Fallback: if the API is unreachable, the frontend builds an offline preview
  locally so preview + PDF still work.

Neon table (`public.schemes`): `id, school, subject, term, class, year,
number_of_weeks, single_periods_per_week, double_periods_per_week,
form_data JSONB, rows JSONB, created_at, updated_at`.

## Production deploy (single service)

Build the frontend, then start the API (it serves `dist/` + SPA fallback):

```sh
npm run build
npm run build --prefix server
npm start --prefix server
```

Env vars: `DATABASE_URL`, `OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, `PORT`.

## Production deploy (Vercel)

This repo also deploys to Vercel as-is. The frontend (`dist/`) is served statically
by Vercel, and `api/index.ts` is a serverless function that reuses the same Express
`createApp()` (`server/src/app.ts`). `vercel.json` wires it all together:

- `installCommand` installs both the root and `server/` dependencies.
- `buildCommand` runs `npm run build` **and** `npm run build --prefix server` (the
  serverless function imports the compiled `server/dist/app.js`).
- `/api/*` is routed to the function; everything else falls back to `index.html`
  (SPA).

Deploy steps:

1. Push to GitHub, then **Import** the repo in Vercel. Framework preset: **Vite**.
   Build/install commands and rewrites come from `vercel.json` automatically.
2. Add **Environment Variables** (Settings → Environment Variables) for Production
   (and Preview) — these are injected into the serverless function at runtime:

   | Variable | Value | Where it's used |
   |---|---|---|
   | `DATABASE_URL` | Neon pooled connection string | API (Neon Postgres) |
   | `OPENROUTER_API_KEY` | OpenRouter key | API (AI generation) |
   | `OPENROUTER_MODEL` | `openai/gpt-4o-mini` (recommended) | API |
   | `AUTH_JWKS_URL` | Neon Auth `…/auth/.well-known/jwks.json` | API (JWT verify) |
   | `VITE_NEON_AUTH_URL` | Neon Auth base URL | Frontend (login) |
   | `TRUST_PROXY` | `1` | API (rate-limit sees real IP behind Vercel) |

   **Do not set `VITE_API_URL`** — the frontend calls same-origin `/api/...`, which
   Vercel routes to the function. Leave `CORS_ORIGIN` empty (same-origin).
3. **Allow your domain in Neon Auth.** Sign-in from the live site fails with
   `INVALID_ORIGIN` ("Invalid origin") unless the deployed origin is trusted.
   This is configured in **Neon Console → KIA-SCHEME-GENIE → Auth →
   Configuration → Domains** (not in Vercel): add `https://<project>.vercel.app`
   exactly — with `https://`, no trailing slash. `localhost` is pre-approved, so
   dev works without it. Wildcards such as `https://*.vercel.app` cover preview
   deployments.
4. **Deploy.** The API is available at `https://<project>.vercel.app/api/health`.

Caveats vs. a single server: serverless is stateless, so the in-memory rate-limit
buckets reset on cold starts (best-effort), and generation is capped by Vercel's
function `maxDuration` (60s) — more than enough for `gpt-4o-mini` (~2s typical).

## Security notes

- `.env` / `server/.env` are git-ignored. Rotate any previously committed keys
  (Supabase anon key, OpenRouter key) in their dashboards.
