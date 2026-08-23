const FXTWITTER_BASE = process.env.FXTWITTER_BASE ?? "https://api.fxtwitter.com";
const FXTWITTER_TIMEOUT_MS = 6000;

type FxTwitterBlock = { text?: string };

type FxTwitterResponse = {
  code?: number;
  tweet?: {
    text?: string;
    article?: {
      content?: {
        blocks?: FxTwitterBlock[];
      };
    };
  };
};

/**
 * Resolves a tweet (or X Article) permalink to its real text via FxTwitter's
 * public extraction API — a purpose-built X data layer (not a generic page
 * renderer, so it isn't subject to the shared-abuse domain blocks generic
 * reader proxies hit), free and unauthenticated. Handles X Articles, which
 * X's own oEmbed endpoint doesn't expose. Returns null on any failure so the
 * caller can fall back rather than guess.
 */
export async function fetchTweetTextViaFxTwitter(tweetUrl: string): Promise<string | null> {
  const match = tweetUrl.match(/(?:twitter\.com|x\.com)\/(\w+)\/status(?:es)?\/(\d+)/i);
  if (!match) return null;
  const [, handle, id] = match;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FXTWITTER_TIMEOUT_MS);

  try {
    const response = await fetch(`${FXTWITTER_BASE}/${handle}/status/${id}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as FxTwitterResponse;
    if (data.code !== 200 || !data.tweet) return null;

    const blocks = data.tweet.article?.content?.blocks;
    if (blocks && blocks.length > 0) {
      const body = blocks
        .map((block) => block.text?.trim())
        .filter(Boolean)
        .join("\n\n");
      if (body && body.length >= 20) return body;
    }

    const text = data.tweet.text?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
