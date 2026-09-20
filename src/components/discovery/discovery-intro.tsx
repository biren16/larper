"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { TopicViewModel } from "@/domain/discovery/services";
import { Artwork } from "./artwork";
import styles from "./discovery-intro.module.css";

export const DISCOVERY_INTRO_STORAGE_KEY = "larper:intro:v1";

type IntroPhase = "playing" | "exiting" | "hidden";

let introStartedInThisDocument = false;
let activeIntroInstances = 0;

function hasSeenIntro(): boolean {
  try {
    return window.sessionStorage.getItem(DISCOVERY_INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberIntro(): void {
  try {
    window.sessionStorage.setItem(DISCOVERY_INTRO_STORAGE_KEY, "1");
  } catch {
    // The intro remains usable when storage is blocked.
  }
}

export function DiscoveryIntro({ items }: { items: TopicViewModel[] }) {
  const [signals] = useState(() => items.slice(0, 3));
  const [phase, setPhase] = useState<IntroPhase>("playing");
  const phaseRef = useRef<IntroPhase>("playing");
  const exitTimerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    phaseRef.current = "exiting";
    document.documentElement.dataset.larperIntro = "exiting";
    setPhase("exiting");

    exitTimerRef.current = window.setTimeout(() => {
      phaseRef.current = "hidden";
      document.documentElement.dataset.larperIntro = "seen";
      setPhase("hidden");
    }, 320);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seenBeforeThisDocument = hasSeenIntro() && !introStartedInThisDocument;

    activeIntroInstances += 1;

    if (reduceMotion || seenBeforeThisDocument) {
      rememberIntro();
      phaseRef.current = "hidden";
      root.dataset.larperIntro = "seen";
      const hiddenFrame = window.requestAnimationFrame(() => setPhase("hidden"));
      return () => {
        window.cancelAnimationFrame(hiddenFrame);
        activeIntroInstances -= 1;
      };
    }

    introStartedInThisDocument = true;
    rememberIntro();
    root.dataset.larperIntro = "playing";

    const automaticExit = window.setTimeout(dismiss, 2680);
    const interrupt = () => dismiss();

    window.addEventListener("keydown", interrupt);
    window.addEventListener("pointerdown", interrupt);
    window.addEventListener("wheel", interrupt, { passive: true });

    return () => {
      window.clearTimeout(automaticExit);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("wheel", interrupt);
      activeIntroInstances -= 1;
      window.setTimeout(() => {
        if (activeIntroInstances === 0) root.dataset.larperIntro = "seen";
      }, 0);
    };
  }, [dismiss]);

  if (phase === "hidden") return null;

  const [lead, secondary, tertiary] = signals;

  return (
    <div
      className={`${styles.overlay} ${phase === "exiting" ? styles.exiting : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="LARPer opening intro"
    >
      <button className={styles.skip} type="button" onClick={dismiss}>
        Skip intro
      </button>

      <div className={styles.stage} aria-hidden="true">
        <div className={styles.cobaltField} />
        <div className={styles.redField} />
        <div className={styles.halftone} />

        <p className={styles.signalLabel}>Signal incoming</p>
        <div className={styles.wordmark}>LARPer</div>
        <p className={styles.promise}>Find it. Get the lore.</p>

        {lead && (
          <figure className={`${styles.signal} ${styles.signalLead}`}>
            <Artwork media={lead.media} priority />
            <figcaption>
              <span>{lead.niche.name}</span>
              <strong>{lead.topic.title}</strong>
            </figcaption>
          </figure>
        )}

        {secondary && (
          <figure className={`${styles.signal} ${styles.signalSecondary}`}>
            <Artwork media={secondary.media} />
            <figcaption>{secondary.topic.type.replace("_", " ")}</figcaption>
          </figure>
        )}

        {tertiary && (
          <figure className={`${styles.signal} ${styles.signalTertiary}`}>
            <Artwork media={tertiary.media} />
            <figcaption>{tertiary.topic.freshnessLabel}</figcaption>
          </figure>
        )}

        <div className={styles.liveStamp}>RN</div>
      </div>
    </div>
  );
}
