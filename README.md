# Crumbs

Paste a tweet, get what it means and how to actually do it. One free breakdown per device; after that, a free account is required.

## Getting started

```bash
cp .env.local.example .env.local
# then fill in OPENAI_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN in .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `OPENAI_API_KEY` set, submitting a tweet returns a clear "add a key" error instead of a breakdown. Without the Upstash Redis vars set, the app still runs, but there's no persistence — everyone gets unlimited free tries and accounts can't be created.

## How it works

- `src/app/page.tsx` — the paste form, the dawn-cyclorama state machine (night → first light → dawn → day / blackout), the account pill, and the sign-up/log-in gate modal.
- `src/app/api/breakdown/route.ts` — checks the caller's quota (free-try or signed-in daily cap), then streams OpenAI's response straight through to the client using a plain-text `§§CORE` / `§§TERMS` / `§§STEPS` / `§§END` protocol.
- `src/lib/parse-breakdown.ts` — parses that protocol incrementally, so sections light up as they arrive.
- `src/lib/auth.ts` — email/password accounts and cookie sessions, backed by Redis.
- `src/lib/anon.ts` — the persistent anonymous device id used to track the one free try.
- `src/lib/rate-limit.ts` — quota logic: 1 free breakdown per device (backstopped by a per-IP daily cap on free-try grants, so clearing cookies from one IP doesn't buy unlimited tries), and a generous daily cap per signed-in account so a single account can't run away with cost.
- `src/app/api/auth/*` — signup, login, logout, and session-check routes.

### On the free-try gate

This raises the bar against casual abuse — reopening the tab or clearing localStorage doesn't reset it, since the identifier is a server-set `httpOnly` cookie checked against Redis, not client-side storage. It is not bulletproof: a determined person can still get more free tries via a different browser, an incognito window, or a VPN/different IP. Treat it as a meaningful deterrent and a conversion nudge, not an absolute guarantee against cost abuse — the account daily cap and the OpenAI request-size/output caps in `route.ts` are the harder backstops.

## Deploy on Vercel

```bash
npx vercel env add OPENAI_API_KEY production
npx vercel env add KV_REST_API_URL production
npx vercel env add KV_REST_API_TOKEN production
npx vercel deploy --prod
```

Add an Upstash Redis database first — either through the Vercel dashboard's Marketplace tab ("Upstash") or directly at [console.upstash.com](https://console.upstash.com) — and use the REST URL/token it gives you.
