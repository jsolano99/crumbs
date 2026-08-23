"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";
import styles from "./page.module.css";
import { learnMoreUrl, parseTerms, splitParagraphs } from "@/lib/parse-breakdown";

export type DeckCard = {
  key: string;
  label: string;
  body: string;
};

const SWIPE_DISTANCE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 0.5; // px/ms
const FLY_OUT_DISTANCE = 700;
const TRANSITION_MS = 340;
const EASE = "cubic-bezier(0.19, 1, 0.22, 1)";

export function SwipeDeck({ cards }: { cards: DeckCard[] }) {
  const [index, setIndex] = useState(0);
  const [liveOffset, setLiveOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitingKey, setExitingKey] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState<1 | -1>(-1);
  const dragStartX = useRef(0);
  const dragStartTime = useRef(0);
  const pointerId = useRef<number | null>(null);

  if (cards.length === 0) return null;

  const atStart = index === 0;
  const atEnd = index === cards.length - 1;

  function commitSwipe(direction: "left" | "right") {
    const canAdvance = direction === "left" && index < cards.length - 1;
    const canRetreat = direction === "right" && index > 0;
    if (!canAdvance && !canRetreat) return;

    const leaving = cards[index];
    setExitingKey(leaving.key);
    setExitDirection(direction === "left" ? -1 : 1);
    setIndex((i) => (direction === "left" ? i + 1 : i - 1));

    window.setTimeout(() => {
      setExitingKey((current) => (current === leaving.key ? null : current));
    }, TRANSITION_MS);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>, relative: number) {
    if (relative !== 0 || exitingKey) return;
    if ((event.target as HTMLElement).closest("a")) return;
    pointerId.current = event.pointerId;
    dragStartX.current = event.clientX;
    dragStartTime.current = performance.now();
    setDragging(true);
    setLiveOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (pointerId.current !== event.pointerId) return;
    setLiveOffset(event.clientX - dragStartX.current);
  }

  function releaseDrag(event: PointerEvent<HTMLElement>) {
    if (pointerId.current !== event.pointerId) return;
    pointerId.current = null;
    setDragging(false);

    const elapsed = Math.max(1, performance.now() - dragStartTime.current);
    const velocity = liveOffset / elapsed;
    const distanceEnough = Math.abs(liveOffset) > SWIPE_DISTANCE_THRESHOLD;
    const velocityEnough = Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD;

    if (distanceEnough || velocityEnough) {
      commitSwipe(liveOffset < 0 ? "left" : "right");
    }
    setLiveOffset(0);
  }

  function goNext() {
    if (!exitingKey) commitSwipe("left");
  }

  function goPrev() {
    if (!exitingKey) commitSwipe("right");
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") goPrev();
    if (event.key === "ArrowRight") goNext();
  }

  return (
    <div
      className={styles.deck}
      role="group"
      aria-roledescription="carousel"
      aria-label="Breakdown"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <p className="sr-only" aria-live="polite">
        Card {index + 1} of {cards.length}: {cards[index].label}
      </p>

      <div className={styles.deckStack}>
        {cards.map((card, i) => {
          const relative = i - index;
          const isExiting = card.key === exitingKey;
          if (!isExiting && relative < 0) return null;

          let style: CSSProperties;

          if (isExiting) {
            style = {
              transform: `translateX(${exitDirection * FLY_OUT_DISTANCE}px) rotate(${exitDirection * 16}deg)`,
              opacity: 0,
              transition: `transform ${TRANSITION_MS}ms ${EASE}, opacity ${TRANSITION_MS}ms ease`,
              zIndex: cards.length + 1,
              pointerEvents: "none",
            };
          } else if (relative === 0) {
            style = dragging
              ? {
                  transform: `translateX(${liveOffset}px) rotate(${liveOffset / 18}deg)`,
                  transition: "none",
                  zIndex: cards.length,
                  cursor: "grabbing",
                  touchAction: "pan-y",
                }
              : {
                  transform: "translateX(0px) rotate(0deg)",
                  transition: `transform ${TRANSITION_MS}ms ${EASE}`,
                  zIndex: cards.length,
                  cursor: "grab",
                  touchAction: "pan-y",
                };
          } else {
            const depth = Math.min(relative, 2);
            style = {
              transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
              transition: `transform ${TRANSITION_MS}ms ${EASE}`,
              zIndex: cards.length - relative,
            };
          }

          return (
            <article
              key={card.key}
              className={styles.deckCard}
              data-band={card.key}
              style={style}
              onPointerDown={(event) => handlePointerDown(event, relative)}
              onPointerMove={handlePointerMove}
              onPointerUp={releaseDrag}
              onPointerCancel={releaseDrag}
            >
              <p className={styles.bandLabel}>{card.label}</p>
              {card.key === "terms"
                ? parseTerms(card.body).map((entry) => (
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
                  ))
                : splitParagraphs(card.body).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className={styles.bandBody}>
                      {paragraph}
                    </p>
                  ))}
            </article>
          );
        })}
      </div>

      <div className={styles.deckNav}>
        <button
          type="button"
          className={styles.deckNavButton}
          onClick={goPrev}
          disabled={atStart}
          aria-label="Previous card"
        >
          ‹
        </button>
        <div className={styles.deckDots} aria-hidden="true">
          {cards.map((card, i) => (
            <span key={card.key} className={styles.deckDot} data-active={i === index} />
          ))}
        </div>
        <button type="button" className={styles.deckNavButton} onClick={goNext} disabled={atEnd} aria-label="Next card">
          ›
        </button>
      </div>
    </div>
  );
}
