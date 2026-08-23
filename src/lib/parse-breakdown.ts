export type Breakdown = {
  title?: string;
  core?: string;
  terms?: string;
  steps?: string;
};

const MARKERS = ["§§CORE", "§§TERMS", "§§STEPS"] as const;

function stripTrailingPartialMarker(value: string): string {
  return value.replace(/§{1,2}[A-Z]{0,6}$/, "").trimEnd();
}

/** Drops the model's thinking pass so it can never leak into a visible card. */
function dropAskSection(text: string): string {
  const start = text.indexOf("§§ASK");
  if (start < 0) return text;

  const rest = text.slice(start + "§§ASK".length);
  const nextOffsets = MARKERS.map((name) => rest.indexOf(name)).filter((index) => index >= 0);
  const after = nextOffsets.length > 0 ? rest.slice(Math.min(...nextOffsets)) : "";
  return `${text.slice(0, start)}${after}`.trim();
}

function parseAskTitle(text: string): string | undefined {
  const start = text.indexOf("§§ASK");
  if (start < 0) return undefined;

  const rest = text.slice(start + "§§ASK".length);
  const nextOffsets = ["§§CORE", "§§TERMS", "§§STEPS", "§§END"]
    .map((name) => rest.indexOf(name))
    .filter((index) => index >= 0);
  const askBody = nextOffsets.length > 0 ? rest.slice(0, Math.min(...nextOffsets)) : rest;
  const match = askBody.match(/^Title:\s*(.+)$/m);
  const title = match?.[1]?.replace(/^["']|["']$/g, "").trim();
  return title || undefined;
}

/**
 * Parses the model's §§ASK / §§CORE / §§TERMS / §§STEPS / §§END protocol.
 * §§ASK is a required thinking step the model must write first; it is not
 * a card, so this parser ignores it and only surfaces CORE / TERMS / STEPS.
 * Safe to call on a partial, still-streaming buffer.
 *
 * Pass `complete: true` once the response has fully finished (not mid-stream)
 * to enable a backstop: if the model ever ignores the marker protocol
 * entirely and just returns plain prose, that text is shown as the core
 * section instead of silently disappearing. Never applied while still
 * streaming, since an early chunk not yet containing a marker is normal.
 */
export function parseBreakdown(raw: string, options?: { complete?: boolean }): Breakdown {
  const endIndex = raw.indexOf("§§END");
  const sliced = endIndex >= 0 ? raw.slice(0, endIndex) : raw;
  const title = parseAskTitle(sliced);
  const text = dropAskSection(sliced);

  const positions = MARKERS.map((name) => ({ name, index: text.indexOf(name) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  const sections: Breakdown = {};
  if (title) sections.title = title;

  positions.forEach((position, i) => {
    const start = position.index + position.name.length;
    const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
    const content = stripTrailingPartialMarker(text.slice(start, end).trim());

    if (!content) return;
    if (position.name === "§§CORE") sections.core = content;
    if (position.name === "§§TERMS") sections.terms = content;
    if (position.name === "§§STEPS") sections.steps = content;
  });

  if (positions.length === 0 && options?.complete) {
    const fallback = stripTrailingPartialMarker(text.trim());
    if (fallback) sections.core = fallback;
  }

  return sections;
}

/** Splits a section's body on blank lines, so multi-paragraph text renders with real spacing. */
export function splitParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const LIST_ITEM = /^(?:[-•*]|\d+[.)])\s+/;

/** If every non-empty line is a bullet or numbered item, return the items; otherwise null. */
export function parseListItems(body: string): string[] | null {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || !lines.every((line) => LIST_ITEM.test(line))) return null;
  return lines.map((line) => line.replace(LIST_ITEM, ""));
}

function bulletsFromBody(body: string): string[] {
  const items = parseListItems(body);
  if (items) return items;
  return splitParagraphs(body).flatMap((paragraph) =>
    paragraph
      .split("\n")
      .map((line) => line.replace(LIST_ITEM, "").trim())
      .filter(Boolean)
  );
}

function formatShareBlock(header: string, items: string[]): string {
  return [`[ ${header} ]`, "", ...items.map((item) => `- ${item}`)].join("\n");
}

const SHARE_FOOTER = "This breakdown was generated and sent by crumbs.";

/** True when the model wrote a "nothing here" stand-in instead of real content. */
function isPlaceholderItem(item: string): boolean {
  const text = item.trim().toLowerCase().replace(/[.!?…]+$/, "");
  if (!text) return true;
  if (/^(none|n\/a|nil|nothing)$/.test(text)) return true;
  if (/^no terms?\b/.test(text)) return true;
  if (/nothing (to |needs? )?(explain|implement|do|here)/.test(text)) return true;
  if (/(need|needs) (no )?explanation/.test(text)) return true;
  if (/no (jargon|terms) (need|to|here)/.test(text)) return true;
  return false;
}

function usableItems(items: string[]): string[] {
  return items.filter((item) => !isPlaceholderItem(item));
}

function shareSections(sections: Breakdown): { header: string; items: string[] }[] {
  const blocks: { header: string; items: string[] }[] = [];

  if (sections.core) {
    const items = usableItems(bulletsFromBody(sections.core));
    if (items.length > 0) blocks.push({ header: "Core idea", items });
  }

  if (sections.terms) {
    const terms = parseTerms(
      sections.terms
        .split("\n")
        .map((line) => line.replace(LIST_ITEM, "").trim())
        .filter(Boolean)
        .join("\n")
    );
    const rawItems = terms.length
      ? terms.map((entry) => `${entry.term} — ${entry.definition}`)
      : bulletsFromBody(sections.terms);
    const items = usableItems(rawItems);
    if (items.length > 0) blocks.push({ header: "Terms explained", items });
  }

  if (sections.steps) {
    const items = usableItems(bulletsFromBody(sections.steps));
    if (items.length > 0) blocks.push({ header: "How to implement it", items });
  }

  return blocks;
}

export function formatEmailSubject(title?: string): string {
  const topic = title?.trim() || "this lesson";
  return `re: ${topic}`;
}

/**
 * Plaintext for mailto / native share: each card title as a header,
 * with the card's points as bullets underneath, then a Crumbs footer.
 * Pass `includeSubject` on the share-sheet path so iMessage gets the
 * same "re: …" line the email subject uses — iOS does not
 * put `navigator.share`'s title into the message body.
 */
export function formatBreakdownShare(
  sections: Breakdown,
  options?: { includeSubject?: boolean }
): string {
  const body = shareSections(sections)
    .map(({ header, items }) => formatShareBlock(header, items))
    .join("\n\n");
  const withFooter = body ? `${body}\n\n${SHARE_FOOTER}` : SHARE_FOOTER;
  if (!options?.includeSubject) return withFooter;
  return `${formatEmailSubject(sections.title)}\n\n${withFooter}`;
}

export type TermEntry = {
  term: string;
  definition: string;
};

/** Parses "§§TERMS" lines of the form "Term — plain explanation" into structured entries. */
export function parseTerms(body: string): TermEntry[] {
  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const dashIndex = line.indexOf("—");
      if (dashIndex === -1) return { term: "", definition: line };
      return {
        term: line.slice(0, dashIndex).trim(),
        definition: line.slice(dashIndex + 1).trim(),
      };
    })
    .filter((entry) => entry.term.length > 0);
}

/** A search URL for "Tell me more about {term}", opened in a new tab from a term link. */
export function learnMoreUrl(term: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`Tell me more about ${term}`)}`;
}

export function extractError(raw: string): string | null {
  const marker = "§§ERROR";
  const index = raw.indexOf(marker);
  if (index < 0) return null;
  return raw.slice(index + marker.length).trim() || "The model returned an error.";
}
