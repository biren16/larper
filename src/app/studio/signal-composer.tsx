"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./studio.module.css";

function SubmitSignal() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Adding signal…" : "Add to evidence inbox"}</button>;
}

export function SignalComposer({
  niches,
  action,
}: {
  niches: Array<{ id: string; name: string }>;
  action?: (form: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!open) return;
    urlRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.mobileSignalButton}
        aria-controls="signal-composer"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        Add signal
      </button>
      {open && <button className={styles.composerScrim} type="button" aria-label="Dismiss add signal panel" onClick={close} />}
      <section
        id="signal-composer"
        className={styles.composer}
        data-open={open}
        aria-labelledby="signal-composer-heading"
        role={open ? "dialog" : "region"}
        aria-modal={open ? true : undefined}
      >
        <header className={styles.composerHeader}>
          <div><p className={styles.kicker}>Quick capture</p><h2 id="signal-composer-heading">Add a signal</h2></div>
          <button type="button" className={styles.closeComposer} aria-label="Close signal composer" onClick={close}>Close</button>
        </header>
        <p className={styles.composerIntro}>Save the public link and your read on why it is moving. Verification happens in the queue.</p>
        <form className={styles.signalForm} aria-label="Add a manual signal" action={action}>
          <label>Public URL<input ref={urlRef} name="url" type="url" required placeholder="https://…" /></label>
          <label>What is moving?<input name="title" required maxLength={180} placeholder="The one-line version of the moment" /></label>
          <div className={styles.formPair}>
            <label>Platform<select name="platform" defaultValue="instagram"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="reddit">Reddit</option><option value="x">X</option><option value="youtube">YouTube</option><option value="web">Web</option></select></label>
            <label>Region<select name="region" defaultValue="india"><option value="india">India</option><option value="global">Global</option></select></label>
          </div>
          <label>Source name<input name="sourceName" required placeholder="Account, publication, or creator" /></label>
          <label>Niche<select name="suggestedNicheId" defaultValue=""><option value="">Choose later</option>{niches.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label>
          <label>Observation<textarea name="observationNote" rows={3} placeholder="What makes this feel real, not just loud?" /></label>
          <label>Published at<input name="publishedAt" type="datetime-local" required /></label>
          <SubmitSignal />
        </form>
      </section>
    </>
  );
}
