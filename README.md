# KIA Schemes — AI Scheme of Work Generator

Generate professional Schemes of Work for Ugandan secondary schools. Teachers fill a
questionnaire, AI completes learning outcomes/resources/methodology, and the app
previews + exports a landscape A4 PDF.

Stack: React + Vite frontend, Express API (`server/`) backed by Neon Postgres,
OpenRouter for AI generation.

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
```

Run both (in two terminals):

```sh
npm run dev              # frontend on :8080, proxies /api → :4000
npm run dev --prefix server   # API on :4000
```

Frontend env (optional, `.env`): only set `VITE_API_URL` if the API is hosted
separately. Same-origin works by default.

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
