import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeaderMenu } from "./header-menu";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("HeaderMenu", () => {
  beforeEach(() => {
    pathname = "/";
    window.history.replaceState({}, "", "/");
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("opens as a modal menu and restores focus after closing", () => {
    render(<HeaderMenu />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Site menu" })).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Discovery" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Your Larps" })).toBeVisible();

    fireEvent.click(within(screen.getByRole("dialog", { name: "Site menu" })).getByRole("button", { name: "Close menu" }));
    act(() => vi.advanceTimersByTime(180));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on cancel and after choosing a destination", () => {
    render(<HeaderMenu />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(trigger);
    fireEvent(screen.getByRole("dialog", { name: "Site menu" }), new Event("cancel", { cancelable: true }));
    act(() => vi.advanceTimersByTime(180));
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("link", { name: "Your Larps" }));
    act(() => vi.advanceTimersByTime(180));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the blank dialog surface is selected", () => {
    render(<HeaderMenu />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("dialog", { name: "Site menu" }));
    act(() => vi.advanceTimersByTime(180));

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("marks the current destination inside the menu", () => {
    window.history.replaceState({}, "", "/#your-larps");
    render(<HeaderMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("link", { name: "Your Larps" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Discovery" })).not.toHaveAttribute("aria-current");
  });
});
