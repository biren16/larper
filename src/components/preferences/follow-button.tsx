"use client";

import { Check, Plus } from "@phosphor-icons/react";
import { useFollowedNiches } from "./followed-niches-provider";
import styles from "./follow-button.module.css";

export function FollowButton({ nicheId, nicheName, compact = false }: { nicheId: string; nicheName: string; compact?: boolean }) {
  const { isFollowed, toggleFollow } = useFollowedNiches();
  const followed = isFollowed(nicheId);

  return (
    <button
      className={`${styles.button} ${compact ? styles.compact : ""} ${followed ? styles.following : ""}`}
      type="button"
      aria-pressed={followed}
      aria-label={`${followed ? "Stop" : "Start"} larping in ${nicheName}`}
      onClick={() => toggleFollow(nicheId, nicheName)}
    >
      {followed ? <Check aria-hidden weight="bold" /> : <Plus aria-hidden weight="bold" />}
      <span>{followed ? "Larping" : "Start larping"}</span>
    </button>
  );
}
