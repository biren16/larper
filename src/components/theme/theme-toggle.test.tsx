import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle, THEME_STORAGE_KEY } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("switches to dark mode and persists the explicit choice", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("uses a saved theme on hydration", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
    });
  });
});
