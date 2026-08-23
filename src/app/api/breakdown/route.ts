import type { NextRequest } from "next/server";
import { getSessionEmail } from "@/lib/auth";
import { getOrCreateAnonId } from "@/lib/anon";
import {
  checkAnonymousQuota,
  checkUserQuota,
  getClientIp,
  recordAnonymousUse,
  recordUserUse,
} from "@/lib/rate-limit";
import { extractTweetUrl, fetchTweetTextFromUrl } from "@/lib/tweet-oembed";
import { fetchTweetTextViaFxTwitter } from "@/lib/fxtwitter";

export const runtime = "nodejs";

const MODEL = "gpt-4o-mini";
const MAX_TWEET_LENGTH = 6000;
const MAX_RESOLVED_LENGTH = 8000;
const MAX_OUTPUT_TOKENS = 900;
const URL_PATTERN = /https?:\/\/\S+/gi;

/** True when, after stripping URLs, there's essentially no real tweet text left to work with. */
function isUrlOnly(text: string): boolean {
  return text.replace(URL_PATTERN, "").trim().length < 10;
}

const SYSTEM_PROMPT = `You are Crumbs. The user pastes in the text of a tweet (or a short tweet thread) about something they may not understand. Your job is not to summarize the tweet — it's to teach the real idea behind it as a genuine mini-lesson, the way a good teacher would explain it to someone encountering it for the first time. Always assume zero prior knowledge of the topic: never assume the reader already knows what any term, tool, technique, or concept mentioned actually means. Explain it as plainly and patiently as you would to a smart five-year-old, without being condescending or losing real substance.

Respond in plain text using exactly this structure, in this order, with nothing before, between, or after the marked sections:

§§CORE
A short, genuine mini-lesson that teaches the real idea behind the tweet from scratch — not just what the tweet says, but why it's true, why it works, or why it matters. Write it as 2 short paragraphs separated by a blank line, never one dense block: the first paragraph introduces the idea using a simple analogy or everyday example; the second explains why it matters or how it plays out, tied back to what the tweet specifically says. Keep each paragraph to 2-3 sentences so it stays easy to scan at a glance. Write for someone smart but completely new to this topic.

§§TERMS
Only include this section if the tweet uses jargon, acronyms, tools, products, or references an average reader would not already know. List each on its own line as "Term — plain explanation," explained as simply as you'd explain it to a curious kid. If nothing in the tweet needs explaining, omit this entire section, including the §§TERMS marker itself.

§§STEPS
First decide honestly which kind of tweet this is. Only write a numbered list of concrete implementation steps if the tweet is genuinely instructional — it describes a technique, habit, workflow, or tool the reader could actually go do to achieve some outcome for themselves. If instead the tweet is informational — news, market or economic commentary, a fact, an analysis, an opinion, or an observation about what's happening in the world — there is nothing for a reader to implement, and you must not invent generic filler like "research this" or "look up that" just to fill the section; padding a list where there's nothing to do is worse than admitting it. In that case, write exactly one plain sentence under this marker saying this tweet is informational rather than something to act on, and stop there — no numbered list. When steps are genuinely warranted, spell out anything a beginner would need to know; don't assume expert-level familiarity.

§§END

Rules: never fabricate facts about the tweet's author, its engagement, or context beyond what is in the pasted text. Do not editorialize about whether the tweet is right or wrong. Keep the tone warm, clear, and patient, like a good teacher — no hype, no filler, no restating the tweet back verbatim.

Critical: you cannot open links, browse the web, or see what a URL points to. If what's pasted is only a link, or a link plus so little surrounding text that you don't actually know what the tweet says, do not guess, invent, or assume its content under any circumstances — a wrong guess is worse than no answer. Instead, put only this under §§CORE and stop there, with no §§TERMS or §§STEPS section: "I can only read the text you paste in, not links — I can't see what this tweet actually says. Copy the tweet's own words and paste those in instead."`;

export async function POST(request: NextRequest) {
  let tweetText = "";

  try {
    const body = await request.json();
    tweetText = typeof body?.tweetText === "string" ? body.tweetText.trim() : "";
  } catch {
    return Response.json({ error: "Couldn't read that request." }, { status: 400 });
  }

  if (!tweetText) {
    return Response.json({ error: "Paste a tweet first." }, { status: 400 });
  }

  if (tweetText.length > MAX_TWEET_LENGTH) {
    return Response.json(
      { error: "That's too long for a single tweet or thread — trim it down and try again." },
      { status: 400 }
    );
  }

  if (isUrlOnly(tweetText)) {
    const tweetUrl = extractTweetUrl(tweetText);
    let resolvedText: string | null = null;

    if (tweetUrl) {
      resolvedText = await fetchTweetTextViaFxTwitter(tweetUrl);
      if (!resolvedText || isUrlOnly(resolvedText)) {
        resolvedText = await fetchTweetTextFromUrl(tweetUrl);
      }
    }

    if (resolvedText && !isUrlOnly(resolvedText)) {
      tweetText = resolvedText.length > MAX_RESOLVED_LENGTH ? `${resolvedText.slice(0, MAX_RESOLVED_LENGTH)}…` : resolvedText;
    } else {
      return Response.json(
        {
          error: tweetUrl
            ? "Couldn't read real text from that link — it may be a protected/deleted tweet, or a tweet that's just an image with no words. Paste the tweet's actual words instead."
            : "That's a link, not the tweet's text — Crumbs can only read tweet links (x.com or twitter.com). Paste the actual words instead.",
        },
        { status: 400 }
      );
    }
  }

  const email = await getSessionEmail();
  const ip = getClientIp(request);

  if (email) {
    const quota = await checkUserQuota(email);
    if (!quota.allowed) {
      return Response.json(
        { error: "You've hit today's limit for your account. Try again tomorrow.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
    await recordUserUse(email);
  } else {
    const anonId = await getOrCreateAnonId();
    const quota = await checkAnonymousQuota(anonId, ip);
    if (!quota.allowed) {
      return Response.json(
        {
          error:
            quota.reason === "device"
              ? "You've used your free breakdown. Create a free account to keep going."
              : "Too many free tries from this connection. Create a free account to keep going.",
          code: "SIGN_UP_REQUIRED",
        },
        { status: 402 }
      );
    }
    await recordAnonymousUse(anonId, ip);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "Crumbs needs an OPENAI_API_KEY to reach the model. Add one to .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Here is the tweet:\n\n${tweetText}` },
        ],
      }),
    });
  } catch {
    return Response.json({ error: "Couldn't reach the model. Check your connection and try again." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `The model request failed (${upstream.status}). ${detail.slice(0, 200)}`.trim() },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      const emitError = (message: string) => {
        controller.enqueue(encoder.encode(`\n§§ERROR\n${message}`));
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }

            if (event.error) {
              const err = event.error as { message?: string } | undefined;
              emitError(err?.message ?? "The model returned an error.");
              continue;
            }

            const choices = event.choices as Array<{ delta?: { content?: string } }> | undefined;
            const content = choices?.[0]?.delta?.content;
            if (typeof content === "string" && content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        }
      } catch {
        emitError("The connection to the model dropped mid-read.");
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
