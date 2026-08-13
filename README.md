# GameSetAI

Local tennis match editor: sign in, upload a video, score points on a timeline, export a highlight reel with an optional scoreboard. Share a link so someone can open the same editor and fix the score without an account.

## Requirements

- Node.js 18+
- FFmpeg on your PATH (or set `FFMPEG_PATH` in `.env`)

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the Supabase project URL + anon key.

For local signup without email confirmation: Supabase dashboard → Authentication → Providers → Email → turn **Confirm email** off.

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3000
- Health: http://localhost:3000/api/health (`ffmpeg: true` when FFmpeg is found)

## Use

1. Sign up as a **player** or a **club** (you can change this later under Account).
2. Upload one or many match videos.
3. Score points, then **Copy player link** from the library or editor.
4. The player opens `/m/:token` with no account — they can fix the score and export.
5. Password reset is on the sign-in page.

Previously uploaded Phase A videos stay on disk but are not in any account. Re-upload them after signing in.

Video files still live in `data/` so FFmpeg can process them. Match metadata is in Supabase.

## Workspace

- `packages/scoring` — tennis rules. Score is always derived via `replay()`. `npm test` runs these fixtures.
- `client` — Vite + React
- `server` — Express API + FFmpeg export

## Tests

```bash
npm test
```
