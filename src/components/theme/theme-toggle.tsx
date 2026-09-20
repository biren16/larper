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

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    queueMicrotask(() => {
      const nextTheme = readTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    });
  }, []);

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme still updates for this visit when storage is unavailable.
    }
  }

  return (
    <fieldset className={styles.selector}>
      <legend className={styles.legend}>Appearance</legend>
      <div className={styles.options}>
        {(["light", "dark"] as const).map((option) => (
          <label className={styles.option} data-active={theme === option || undefined} key={option}>
            <input
              checked={theme === option}
              name="larper-theme"
              onChange={() => selectTheme(option)}
              type="radio"
              value={option}
            />
            <span>{option === "light" ? "Light" : "Dark"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
