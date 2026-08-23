export type Breakdown = {
  core?: string;
  terms?: string;
  steps?: string;
};

const MARKERS = ["§§CORE", "§§TERMS", "§§STEPS"] as const;

function stripTrailingPartialMarker(value: string): string {
  return value.replace(/§{1,2}[A-Z]{0,6}$/, "").trimEnd();
}

/**
 * Parses the model's §§CORE / §§TERMS / §§STEPS / §§END protocol.
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
  const text = endIndex >= 0 ? raw.slice(0, endIndex) : raw;

  const positions = MARKERS.map((name) => ({ name, index: text.indexOf(name) }))
    .filter((entry) => entry.index >= 0)
    .sort((a, b) => a.index - b.index);

  const sections: Breakdown = {};

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
  return [header, "", ...items.map((item) => `- ${item}`)].join("\n");
}

/**
 * Plaintext for mailto / native share: each card title as a header,
 * with the card's points as bullets underneath.
 */
export function formatBreakdownShare(sections: Breakdown): string {
  const blocks: string[] = [];

  if (sections.core) {
    blocks.push(formatShareBlock("Core idea", bulletsFromBody(sections.core)));
  }

  if (sections.terms) {
    const terms = parseTerms(
      sections.terms
        .split("\n")
        .map((line) => line.replace(LIST_ITEM, "").trim())
        .filter(Boolean)
        .join("\n")
    );
    const items = terms.length
      ? terms.map((entry) => `${entry.term} — ${entry.definition}`)
      : bulletsFromBody(sections.terms);
    blocks.push(formatShareBlock("Terms explained", items));
  }

  if (sections.steps) {
    blocks.push(formatShareBlock("How to implement it", bulletsFromBody(sections.steps)));
  }

  return blocks.join("\n\n");
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
