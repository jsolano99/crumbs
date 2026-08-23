"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import {
  extractError,
  formatEmailSubject,
  formatBreakdownShare,
  formatBreakdownShareHtml,
  learnMoreUrl,
  parseBreakdown,
  parseTerms,
  splitParagraphs,
  type Breakdown,
} from "@/lib/parse-breakdown";
import { SwipeDeck, type DeckCard } from "./SwipeDeck";

function openHtmlEmailDraft({
  to,
  subject,
  html,
  plain,
}: {
  to: string;
  subject: string;
  html: string;
  plain: string;
}) {
  const eml = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");

  try {
    const blob = new Blob([eml], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "crumbs.eml";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`;
    if (mailto.length > 2000) {
      void navigator.clipboard.writeText(plain).catch(() => undefined);
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
      return;
    }
    window.location.href = mailto;
  }
}

type Phase = "night" | "first-light" | "dawn" | "day" | "blackout";
type AuthMode = "signup" | "login";

const CUE_LABEL: Record<Phase, string> = {
  night: "Night — paste a tweet",
  "first-light": "First light — sending",
  dawn: "Dawn — reading it",
  day: "Day — ready",
  blackout: "Blackout — something went wrong",
};

const BUTTON_LABEL: Record<Phase, string> = {
  night: "Break it down",
  "first-light": "Sending…",
  dawn: "Reading…",
  day: "Break it down",
  blackout: "Try again",
};

export default function Home() {
  const [tweetText, setTweetText] = useState("");
  const [phase, setPhase] = useState<Phase>("night");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const sections: Breakdown = parseBreakdown(raw, { complete: phase === "day" });
  const isBusy = phase === "first-light" || phase === "dawn";
  const hasBreakdown = phase === "day" && (sections.core || sections.terms || sections.steps);

  const cardEntries: DeckCard[] = [
    sections.core ? { key: "core", label: "Core idea", body: sections.core } : null,
    sections.terms ? { key: "terms", label: "Terms explained", body: sections.terms } : null,
    sections.steps ? { key: "steps", label: "How to implement it", body: sections.steps } : null,
  ].filter((card): card is DeckCard => card !== null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUserEmail(data?.email ?? null))
      .catch(() => setUserEmail(null))
      .finally(() => setAuthChecked(true));
  }, []);

  async function runBreakdown(text: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("first-light");
    setError(null);
    setRaw("");

    try {
      const response = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tweetText: text }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);

        if (data?.code === "SIGN_UP_REQUIRED") {
          setPhase("night");
          setGateMessage(data.error ?? "Create a free account to keep going.");
          setAuthMode("signup");
          setAuthError(null);
          setShowAuthGate(true);
          return;
        }

        throw new Error(data?.error ?? `That didn't work (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let receivedFirstByte = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        if (!receivedFirstByte) {
          receivedFirstByte = true;
          setPhase("dawn");
        }
        setRaw(accumulated);
      }

      const streamError = extractError(accumulated);
      if (streamError) {
        setPhase("blackout");
        setError(streamError);
        return;
      }

      setPhase("day");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPhase("blackout");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = tweetText.trim();
    if (!trimmed || isBusy) return;
    void runBreakdown(trimmed);
  }

  function handleReset() {
    abortRef.current?.abort();
    setPhase("night");
    setRaw("");
    setError(null);
    setTweetText("");
  }

  async function handleEmailMyself() {
    const body = formatBreakdownShare(sections);
    const html = formatBreakdownShareHtml(sections);
    const subject = formatEmailSubject(sections.title);
    if (!body) return;

    const prefersNativeShare =
      typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

    if (prefersNativeShare) {
      try {
        await navigator.share({ title: subject, text: body });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    const to = userEmail ?? "";
    openHtmlEmailDraft({ to, subject, html, plain: body });
  }

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/auth/${authMode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setAuthError(data?.error ?? "Something went wrong.");
        return;
      }

      setUserEmail(data.email);
      setShowAuthGate(false);
      setAuthPassword("");

      const pending = tweetText.trim();
      if (pending) void runBreakdown(pending);
    } catch {
      setAuthError("Couldn't reach the server. Try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUserEmail(null);
  }

  function openLoginGate() {
    setAuthMode("login");
    setGateMessage(null);
    setAuthError(null);
    setShowAuthGate(true);
  }

  return (
    <main className={styles.stage} data-phase={phase}>
      <div className={styles.backdrop} aria-hidden="true">
        <div className={`${styles.layer} ${styles.layerNight}`} />
        <div className={`${styles.layer} ${styles.layerFirstLight}`} />
        <div className={`${styles.layer} ${styles.layerDawn}`} />
        <div className={`${styles.layer} ${styles.layerDay}`} />
        <div className={`${styles.layer} ${styles.layerBlackout}`} />
      </div>

      <p className={styles.cue} role="status" aria-live="polite">
        {CUE_LABEL[phase]}
      </p>

      {authChecked && (
        <div className={styles.accountPill}>
          {userEmail ? (
            <button type="button" className={styles.accountAction} onClick={handleLogout}>
              {userEmail} · Log out
            </button>
          ) : (
            <button type="button" className={styles.accountAction} onClick={openLoginGate}>
              Log in
            </button>
          )}
        </div>
      )}

      <div className={styles.column}>
        <h1 className={styles.wordmark}>Crumbs</h1>
        <p className={styles.tagline}>Paste a tweet. Get a bite-sized lesson in what it means and how to do it.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="tweet" className="sr-only">
            Tweet text
          </label>
          <textarea
            id="tweet"
            className={styles.textarea}
            placeholder="Paste the tweet's text, or an x.com link to it…"
            value={tweetText}
            onChange={(event) => setTweetText(event.target.value)}
            disabled={isBusy}
            required
          />
          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={isBusy || !tweetText.trim()}>
              {BUTTON_LABEL[phase]}
            </button>
          </div>
        </form>

        {phase === "blackout" && error && (
          <div className={styles.errorCard} role="alert">
            {error}
          </div>
        )}

        {hasBreakdown ? (
          <SwipeDeck cards={cardEntries} />
        ) : (
          (sections.core || sections.terms || sections.steps) &&
          phase !== "blackout" && (
            <section className={styles.breakdown} aria-label="Breakdown">
              {sections.core && (
                <article className={styles.band} data-band="core">
                  <p className={styles.bandLabel}>Core idea</p>
                  {splitParagraphs(sections.core).map((paragraph, i) => (
                    <p key={i} className={styles.bandBody}>
                      {paragraph}
                    </p>
                  ))}
                </article>
              )}
              {sections.terms && (
                <article className={styles.band} data-band="terms">
                  <p className={styles.bandLabel}>Terms explained</p>
                  {parseTerms(sections.terms).map((entry) => (
                    <p key={entry.term} className={styles.bandBody}>
                      <a
                        href={learnMoreUrl(entry.term)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.termLink}
                      >
                        {entry.term}
                      </a>
                      {" — "}
                      {entry.definition}
                    </p>
                  ))}
                </article>
              )}
              {sections.steps && (
                <article className={styles.band} data-band="steps">
                  <p className={styles.bandLabel}>How to implement it</p>
                  {splitParagraphs(sections.steps).map((paragraph, i) => (
                    <p key={i} className={styles.bandBody}>
                      {paragraph}
                    </p>
                  ))}
                </article>
              )}
            </section>
          )
        )}

        {(hasBreakdown || phase === "blackout") && (
          <div className={styles.resetRow}>
            <button type="button" className={styles.reset} onClick={handleReset}>
              Paste another tweet
            </button>
            {hasBreakdown && (
              <button type="button" className={styles.share} onClick={() => void handleEmailMyself()}>
                Email this report
              </button>
            )}
          </div>
        )}
      </div>

      <p className={styles.credit}>
        Made by{" "}
        <a
          className={styles.creditLink}
          href="https://jacobsolano.co"
          target="_blank"
          rel="noopener noreferrer"
        >
          Jacob Solano
        </a>
      </p>

      {showAuthGate && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setShowAuthGate(false)}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setShowAuthGate(false)}
              aria-label="Close"
            >
              ×
            </button>

            <p className={styles.bandLabel}>{authMode === "signup" ? "Create account" : "Log in"}</p>
            <h2 id="auth-modal-title" className={styles.modalTitle}>
              {authMode === "signup" ? "One more thing" : "Welcome back"}
            </h2>
            {gateMessage && authMode === "signup" && <p className={styles.modalMessage}>{gateMessage}</p>}

            <form className={styles.modalForm} onSubmit={handleAuthSubmit}>
              <label className={styles.modalLabel} htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className={styles.modalInput}
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                required
                autoFocus
              />
              <label className={styles.modalLabel} htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className={styles.modalInput}
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                minLength={8}
                required
              />

              {authError && (
                <p className={styles.modalError} role="alert">
                  {authError}
                </p>
              )}

              <button type="submit" className={styles.submit} disabled={authBusy}>
                {authBusy ? "Working…" : authMode === "signup" ? "Create account" : "Log in"}
              </button>
            </form>

            <button
              type="button"
              className={styles.modalToggle}
              onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setAuthError(null);
              }}
            >
              {authMode === "signup" ? "Already have an account? Log in" : "Need an account? Sign up"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
