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

## Security notes

- `.env` / `server/.env` are git-ignored. Rotate any previously committed keys
  (Supabase anon key, OpenRouter key) in their dashboards.
