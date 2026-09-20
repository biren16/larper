"use client";

import { useEffect, useState } from "react";
import styles from "./theme-toggle.module.css";

export const THEME_STORAGE_KEY = "larper:theme:v1";

type Theme = "light" | "dark";

function readTheme(): Theme {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // Fall through to the system preference when storage is unavailable.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    queueMicrotask(() => {
      const nextTheme = readTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    });
  }, []);

  const nextTheme: Theme = theme === "light" ? "dark" : "light";
  const label = `Switch to ${nextTheme} mode`;

  function toggleTheme() {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme still updates for this visit when storage is unavailable.
    }
  }

  return (
    <button className={styles.toggle} type="button" onClick={toggleTheme} aria-label={label} title={label}>
      <span aria-hidden="true" className={styles.icon}>{theme === "light" ? "◐" : "◑"}</span>
    </button>
  );
}
