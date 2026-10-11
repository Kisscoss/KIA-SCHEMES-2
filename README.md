# KIA Schemes — AI Scheme of Work Generator

Generate professional Schemes of Work for Ugandan secondary schools. Teachers fill a
questionnaire, AI completes learning outcomes/resources/methodology, and the app
previews + exports a landscape A4 PDF.

## Quick start

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` for local development:

```sh
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-or-anon-key"
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — typecheck + production build (`dist/`)
- `npm run preview` — preview the production build
- `npm test` — run Vitest suite
- `npm run lint` / `npm run typecheck`

## AI generation

- Primary path: Supabase Edge Function `supabase/functions/generate-scheme` using
  OpenRouter (`OPENROUTER_API_KEY`, optional `OPENROUTER_MODEL`, defaults to
  `openrouter/free`).
- Fallback path: if Supabase is unconfigured/unreachable, the frontend builds an
  offline scheme locally so preview + PDF still work.

Deploy the function with secrets set in Supabase (never commit `.env`):

```sh
supabase secrets set OPENROUTER_API_KEY=... OPENROUTER_MODEL=openrouter/free
supabase functions deploy generate-scheme
```

## Production deploy (static hosting)

Build output is `dist/`. For Vercel/Netlify/Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- SPA fallback: rewrite all routes to `/index.html` (required for `/create`, `/preview`)

## Security notes

- `.env` is git-ignored. The previously committed `.env` was untracked; rotate the
  exposed Supabase anon/publishable key and OpenRouter key in their dashboards.
