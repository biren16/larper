import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DISCOVERY_INTRO_STORAGE_KEY, DiscoveryIntro } from "./discovery-intro";

describe("DiscoveryIntro", () => {
  it("uses only the lowercase larper wordmark without topic imagery or supporting copy", async () => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    const { container } = render(<DiscoveryIntro />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Find it. Get the lore.")).not.toBeInTheDocument();
    expect(container.querySelector("[data-intro-wordmark]")).toBeInTheDocument();
    expect(container).toHaveTextContent("larper");
    expect(container).not.toHaveTextContent("LARPer");

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });
  });

  it("owns the page scroll lock only while the intro is active", async () => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    document.documentElement.style.overflow = "";
    const { container } = render(<DiscoveryIntro />);

    expect(document.documentElement.style.overflow).toBe("hidden");

    fireEvent.wheel(window);
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("keeps the cinematic layer decorative and dismissible without utility labels", async () => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    const { container } = render(<DiscoveryIntro />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip intro" })).not.toBeInTheDocument();
    expect(screen.queryByText("Signal incoming")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });
  });

  it.each(["pointerDown", "touchStart"] as const)("dismisses immediately on %s", async (eventName) => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    const { container } = render(<DiscoveryIntro />);

    fireEvent[eventName](window);
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("stays usable when session storage is blocked", async () => {
    const blockedStorage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });
    const { container } = render(<DiscoveryIntro />);

    expect(container.querySelector("[data-intro-wordmark]")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });

    blockedStorage.mockRestore();
  });

  it("does not replay on a later homepage mount in the same session", async () => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    const firstVisit = render(<DiscoveryIntro />);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(firstVisit.container).toBeEmptyDOMElement(), { timeout: 600 });
    firstVisit.unmount();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const returnVisit = render(<DiscoveryIntro />);
    await waitFor(() => expect(returnVisit.container).toBeEmptyDOMElement());
    expect(document.documentElement.style.overflow).toBe("");
  });
});
