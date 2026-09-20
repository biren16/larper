"use client";

import { useState, type MouseEvent } from "react";
import styles from "./story-preview.module.css";

type Preview = { title: string; hook: string; summary: string; why: string; lore: string; context: string };

export function StoryPreview() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const build = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.closest("form");
    if (!form) return;
    const data = new FormData(form);
    setPreview({
      title: String(data.get("title") ?? "Untitled story"), hook: String(data.get("hook") ?? ""),
      summary: String(data.get("summary") ?? ""), why: String(data.get("whyItMatters") ?? ""),
      lore: String(data.get("lore") ?? ""), context: String(data.get("beginnerContext") ?? ""),
    });
  };
  return <div className={styles.preview}>
    <button type="button" className={styles.trigger} onClick={build}>Preview public story</button>
    {preview && <section aria-label="Story preview"><p>Public preview</p><h2>{preview.title}</h2><strong>{preview.hook}</strong><h3>What happened?</h3><p>{preview.summary}</p><h3>Why people care</h3><p>{preview.why}</p><h3>The lore</h3><p>{preview.lore}</p><h3>If you’re new</h3><p>{preview.context}</p></section>}
  </div>;
}
