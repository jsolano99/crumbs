# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Next.js (App Router, TypeScript). Crumbs needs a server-side call to an LLM (and possibly other server logic later), so a pure static frontend isn't enough; Next.js keeps the frontend and a minimal API layer in one deployable project without standing up a separate backend service. Model provider is OpenAI (gpt-4o-mini), chosen explicitly for low per-request cost. Persistence (accounts, sessions, rate-limit counters) is Upstash Redis, chosen for its generous free tier and one-click Vercel Marketplace integration over standing up a relational database for what is currently just key-value data.

## Users

General public, no fixed niche — anyone who comes across a tweet they don't fully understand or want to act on, and wants a plain-language breakdown of what it is and how to actually implement or apply it.

## Product Purpose

Crumbs takes a tweet the user pastes in and produces a structured breakdown: what the tweet is about, and how to implement or apply what it describes. Success is the user leaving with clarity and a concrete next step, without digging through replies or going elsewhere to ask.

## Positioning

Not a generic "summarize this text" tool. Crumbs is built specifically around the tweet as an artifact — short, often context-free, jargon-heavy, sometimes assuming shared context the reader doesn't have. The mechanism is a two-part output (explanation + implementation) tuned for that compressed, referential, often action-oriented shape, rather than a general-purpose summarizer repurposed for tweets.

## Operating Context

User pastes tweet text into Crumbs. Crumbs sends it to an LLM and returns the breakdown. A first-time visitor gets one free breakdown with no account; a second attempt from the same device requires creating a free account (email + password). Signed-in use is capped at a generous daily quota per account. Both limits exist specifically to bound the owner's model API cost, not as a monetization gate — there is currently no paid tier.

## Capabilities and Constraints

- No fixed tweet niche — works generically across technical, business, or everyday tweets.
- Superseded: input was originally pasted-text-only, deliberately avoiding X/Twitter API dependency. Revised after a confirmed fabrication incident (see below): a bare x.com/twitter.com tweet link now resolves to the tweet's real text via X's free, unauthenticated public oEmbed endpoint (`publish.twitter.com/oembed`) — no API key, no paid tier, the same mechanism embed widgets use. Still no full-page scraping, no screenshot/image upload, no thread traversal (only the single linked tweet's text). Any URL that isn't a recognized tweet link, or an oEmbed lookup that fails (protected/deleted tweet, rate-limited, network error), still falls back to asking for pasted text rather than guessing.
- Confirmed incident: a user pasted a tweet URL instead of its text; since the model had no way to read links at the time, it fabricated an entirely fictional breakdown unrelated to the real tweet (and had likely done so silently on earlier working-looking runs too, since a plausible-sounding guess isn't obviously distinguishable from a real answer). First fix was a hard refusal on any URL-only input. Current fix instead attempts real resolution via oEmbed first, and only falls back to refusal if that fails — never falls back to guessing. Never remove the refusal fallback — a wrong guess is worse than a clear "couldn't read that" response.
- Requires a server-side AI call; not achievable as a pure static site.
- Breakdown output is structured, not a flat two-parter: a plain-language summary, key terms/jargon explained when the tweet uses any, and a step-by-step "how to implement or apply this" section. Sections that don't apply to a given tweet (e.g. no jargon present) are omitted rather than forced.
- Superseded: v1 was stateless/no-accounts. As of this revision, Crumbs has real email+password accounts, gated behind a one-free-try-per-device limit, specifically to control API cost as usage grows. No saved history yet — an account currently only exists to lift the daily quota, not to store past breakdowns.
- The free-try gate is a real deterrent, not an absolute one: it's enforced server-side via a persistent device cookie checked against Redis (so it survives closing/reopening the tab, unlike a client-only localStorage check), backstopped by a per-IP daily cap on how many free tries can be granted at all. It can still be evaded by a different browser, incognito, or a different IP/VPN — accepted tradeoff given the cost of a stronger guarantee (e.g. requiring payment info up front) isn't justified at this stage.
- Not yet decided: handling for images embedded in a tweet, multi-tweet threads, or quote-tweets; whether accounts should eventually store breakdown history; whether a paid tier is ever introduced.

## Brand Commitments

None confirmed. Name is "Crumbs."

## Evidence on Hand

None yet — no assets, copy, or confirmed example breakdowns on hand.

## Product Principles

1. Every tweet gets two things back: what it is, and how to implement or act on it — never just a summary.
2. Don't assume a niche; the breakdown should hold up for technical, business, or everyday tweets alike.
3. Keep the input path simple and dependency-free (pasted text) rather than brittle (scraping/URL fetching) until real demand justifies the complexity.
4. Never fabricate tweet content, sources, or attribution — only work with what the user actually pastes in.

## Accessibility & Inclusion

No product-specific requirement established beyond baseline: semantic HTML, keyboard-operable input/output, sufficient contrast.
