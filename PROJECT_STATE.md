# Crumbs — Project State

Snapshot of where things stand. See `CLAUDE.md` for durable architecture/conventions, `PRODUCT.md` for the product spec.

## Current state: deployed, mostly working

Live at **https://crumbs-gamma.vercel.app**. `OPENAI_API_KEY` is set in Vercel (Production + Preview) and confirmed working end-to-end. **Upstash Redis is not yet connected** (`KV_REST_API_URL`/`KV_REST_API_TOKEN` unset) — as of this writing, the free-try gate and accounts don't actually enforce anything in production; every quota check fails open, so anyone gets unlimited anonymous breakdowns and the sign-up gate never triggers.

### Implemented and working

- Paste-text or paste-a-link → structured breakdown (Core idea / Terms explained / How to implement it) via `gpt-4o-mini`, streamed via the §§ protocol (see `CLAUDE.md`).
- Tweet **and X Article** URL resolution via FxTwitter (primary) + oEmbed (fallback) + honest refusal (final backstop).
- SwipeDeck tinder-card reading UI with real drag physics; defined terms link out to a "Tell me more about X" search in a new tab.
- Dawn Cyclorama visual system, fully built and finish-reviewed (see `DESIGN.md`).
- Full email+password auth (signup/login/logout/me routes, bcrypt, Redis sessions) — code complete, functionally inert until Redis is connected.
- Quota/rate-limit logic (1 free try/device, per-IP backstop, per-user daily cap) — same: code complete, inert without Redis.

## Recent important decisions

- **Provider switch**: Anthropic → OpenAI (`gpt-4o-mini`), explicit user request, specifically for cost control.
- **Fabrication incident (fixed, don't regress)**: pasting a bare tweet URL originally caused the model to fabricate an entirely fictional explanation — it had no way to read the link and just guessed. Fixed in two layers that must both stay: server-side `isUrlOnly()` detection before ever calling the model, and a system-prompt instruction to explicitly refuse rather than guess when there's no real content. The URL-resolution pipeline (below) now *resolves* many links instead of refusing them, but the refusal backstop is still load-bearing for cases resolution can't handle.
- **Related incident — unmarked model output**: X Article links initially "resolved" via oEmbed to just a bare `t.co` link (Articles don't expose body text through oEmbed), which the code treated as valid and forwarded to the model — which correctly refused rather than fabricate, but replied in unmarked plain prose that the client's marker-based parser silently dropped, so the page looked like it reset to blank with zero feedback. Fixed two ways: (1) a "resolved" text that's itself still just a URL is now treated as a resolution failure, falling through to refusal; (2) the client parser now shows any non-empty *complete* response even with no §§ markers at all, as a defensive backstop.
- **FxTwitter integration**: confirmed empirically (not assumed) that X Article pages are entirely client-rendered — no plain server fetch, and no generic JS-rendering reader proxy either (tried one; it had all of x.com blocked domain-wide due to unrelated abuse by other users of that service, a shared-reputation failure outside anyone's control). `api.fxtwitter.com` — an open-source, purpose-built X extraction API, not a generic renderer — can read Article bodies via `tweet.article.content.blocks`. Now the primary resolution method; oEmbed is the secondary fallback.
- **"How to implement it" honesty fix, then overcorrection**: the model used to pad this section with generic filler ("research this") for pure news. The first fix told it to classify instructional vs informational — and it started labeling *advice about how to think/live/work* (strategy, mindset, personal frameworks) as "informational" with nothing to implement. Current protocol: required `§§ASK` first (PRACTICE vs WATCH). PRACTICE = the reader can change how they think, decide, work, live, or relate; WATCH = spectator news/events only. When unsure, PRACTICE. Still forbid fake "look this up" steps.
- **Lesson framing**: the model teaches the underlying concept from scratch (ELI5 register, assumes zero prior knowledge, uses analogies) rather than just decoding/summarizing the tweet's literal words — explicit user request, not a default.
- **Digestibility**: the Core section must be 2 short paragraphs, never one dense block; the client splits on blank lines (`splitParagraphs()`) and renders each as its own spaced `<p>`.

## Unresolved / next steps

- **Redis/Upstash not connected in production — the single biggest open gap.** User was given exact steps (Vercel dashboard → Storage tab → add an Upstash integration, or `vercel env add KV_REST_API_URL`/`KV_REST_API_TOKEN` directly) but this hasn't been confirmed done as of the last session. Until it is, don't describe the free-try gate or accounts as "live" — they're built but dormant.
- Real end-to-end auth flow (signup → gate trigger → login → session persistence) has only been verified in isolation with the graceful "not configured" messaging; not yet tested against real Redis credentials.
- No thread traversal, no image/quote-tweet handling — a resolved tweet/Article is always just that single link's own text.
- `MAX_RESOLVED_LENGTH = 8000` chars caps how much of a long Article gets sent to the model (truncated with `…`, not rejected). Untested against a real Article near that length — watch for mid-sentence cutoffs if that comes up.
- No saved breakdown history yet — an account currently only exists to lift the daily quota, not to store past results (noted in `PRODUCT.md` as an open product question).
