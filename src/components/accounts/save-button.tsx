"use client";

import { useState, useTransition } from "react";
import { BookmarkSimple } from "@phosphor-icons/react";
import { setSavedAction } from "@/app/account/actions";
import styles from "./save-button.module.css";

export function SaveButton({
  storyId,
  initialSaved,
  setSaved = setSavedAction,
}: {
  storyId: string;
  initialSaved: boolean;
  setSaved?: (storyId: string, saved: boolean) => Promise<{ ok: boolean; saved?: boolean; error?: string }>;
}) {
  const [saved, updateSaved] = useState(initialSaved);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const toggle = () => {
    const next = !saved;
    updateSaved(next);
    setError("");
    startTransition(async () => {
      const result = await setSaved(storyId, next);
      if (!result.ok) {
        updateSaved(!next);
        setError(result.error ?? "Could not update save");
      }
    });
  };
  return <div className={styles.control}>
    <button type="button" aria-pressed={saved} aria-label={saved ? "Remove saved story" : "Save story"} onClick={toggle} disabled={pending}>
      <BookmarkSimple aria-hidden weight={saved ? "fill" : "regular"} /> {saved ? "Saved" : "Save"}
    </button>
    {error && <span role="alert">{error}</span>}
  </div>;
}
