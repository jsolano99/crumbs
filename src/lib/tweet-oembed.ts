const TWEET_URL_PATTERN = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status(?:es)?\/\d+(?:\?\S*)?/i;
const OEMBED_TIMEOUT_MS = 6000;

/** True when the text is (or contains) a single tweet permalink, e.g. x.com/handle/status/123. */
export function extractTweetUrl(text: string): string | null {
  const match = text.match(TWEET_URL_PATTERN);
  return match ? match[0] : null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

function extractTextFromEmbedHtml(html: string): string | null {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  if (!match) return null;
  const withoutTags = match[1].replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
  return decoded || null;
}

/**
 * Resolves a tweet permalink to its real text via X's public oEmbed endpoint —
 * free, unauthenticated, and designed for exactly this (pulling tweet content
 * to display elsewhere). Returns null on any failure so the caller can fall
 * back to asking for pasted text rather than guessing.
 */
export async function fetchTweetTextFromUrl(tweetUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);

  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    const response = await fetch(oembedUrl, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as { html?: string };
    if (typeof data.html !== "string") return null;

    return extractTextFromEmbedHtml(data.html);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
