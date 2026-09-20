"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
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

export function DiscoveryIntro() {
  const [phase, setPhase] = useState<IntroPhase>("playing");
  const phaseRef = useRef<IntroPhase>("playing");
  const exitTimerRef = useRef<number | null>(null);
  const previousOverflowRef = useRef("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    phaseRef.current = "hidden";
    document.documentElement.dataset.larperIntro = "seen";
    document.documentElement.style.overflow = previousOverflowRef.current;
    setPhase("hidden");
  }, []);

  const dismiss = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    phaseRef.current = "exiting";
    document.documentElement.dataset.larperIntro = "exiting";
    setPhase("exiting");

    exitTimerRef.current = window.setTimeout(finish, 320);
  }, [finish]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const continuingStrictModePlayback =
      introStartedInThisDocument && root.dataset.larperIntro === "playing";
    const seenBeforeThisDocument = hasSeenIntro() && !continuingStrictModePlayback;

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
    previousOverflowRef.current = root.style.overflow;
    root.style.overflow = "hidden";

    let measurementActive = true;
    const measureWordmarkTarget = () => {
      const overlay = overlayRef.current;
      const wordmark = wordmarkRef.current;
      const target = document.querySelector<HTMLElement>('a[aria-label="LARPer home"]');

      if (!overlay || !wordmark || !target || wordmark.offsetWidth === 0) return;

      const targetBox = target.getBoundingClientRect();
      const scale = targetBox.width / wordmark.offsetWidth;
      const scaledHeight = wordmark.offsetHeight * scale;
      const targetY = targetBox.top + (targetBox.height - scaledHeight) / 2;

      overlay.style.setProperty("--intro-target-x", `${targetBox.left}px`);
      overlay.style.setProperty("--intro-target-y", `${targetY}px`);
      overlay.style.setProperty("--intro-target-scale", `${scale}`);
      overlay.style.setProperty("--intro-target-center-x", `${targetBox.left + targetBox.width / 2}px`);
      overlay.style.setProperty("--intro-target-center-y", `${targetBox.top + targetBox.height / 2}px`);
    };

    measureWordmarkTarget();
    void document.fonts?.ready.then(() => {
      if (measurementActive) measureWordmarkTarget();
    });

    const automaticExit = window.setTimeout(dismiss, 2880);
    const cleanupFailsafe = window.setTimeout(finish, 3450);
    const interrupt = () => dismiss();

    window.addEventListener("keydown", interrupt);
    window.addEventListener("pointerdown", interrupt);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("resize", measureWordmarkTarget);
    window.addEventListener("orientationchange", measureWordmarkTarget);

    return () => {
      measurementActive = false;
      window.clearTimeout(automaticExit);
      window.clearTimeout(cleanupFailsafe);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      window.removeEventListener("keydown", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("resize", measureWordmarkTarget);
      window.removeEventListener("orientationchange", measureWordmarkTarget);
      root.style.overflow = previousOverflowRef.current;
      activeIntroInstances -= 1;
      window.setTimeout(() => {
        if (activeIntroInstances === 0) root.dataset.larperIntro = "seen";
      }, 0);
    };
  }, [dismiss, finish]);

  if (phase === "hidden") return null;

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${phase === "exiting" ? styles.exiting : ""}`}
      aria-hidden="true"
    >
      <div className={styles.stage}>
        <div className={`${styles.curtain} ${styles.curtainTop}`} />
        <div className={`${styles.curtain} ${styles.curtainBottom}`} />
        <div className={styles.registrationBand} />
        <div ref={wordmarkRef} className={styles.wordmark} data-intro-wordmark>
          <span className={styles.wordmarkMeasure}>LARPer</span>
          <span className={`${styles.wordmarkSlice} ${styles.sliceTop}`}>LARPer</span>
          <span className={`${styles.wordmarkSlice} ${styles.sliceMiddle}`}>LARPer</span>
          <span className={`${styles.wordmarkSlice} ${styles.sliceBottom}`}>LARPer</span>
          <span className={styles.registrationSquare} />
        </div>
      </div>
    </div>
  );
}
