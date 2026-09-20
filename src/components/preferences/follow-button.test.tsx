import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FollowedNichesProvider } from "./followed-niches-provider";
import { FollowButton } from "./follow-button";
import { PREFERENCES_STORAGE_KEY } from "@/domain/preferences/preferences";

describe("FollowButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("toggles a niche, persists the change, and announces the result", async () => {
    const user = userEvent.setup();
    render(
      <FollowedNichesProvider knownNicheIds={["fragrance", "mechanical-keyboards"]}>
        <FollowButton nicheId="mechanical-keyboards" nicheName="Mechanical Keyboards" />
      </FollowedNichesProvider>,
    );

    const button = screen.getByRole("button", { name: "Start larping in Mechanical Keyboards" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAccessibleName("Stop larping in Mechanical Keyboards");
    expect(screen.getByRole("status")).toHaveTextContent("Mechanical Keyboards added to Your Larps");
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}")).toEqual({
      version: 1,
      followedNicheIds: expect.arrayContaining(["mechanical-keyboards"]),
    });
  });

  it("syncs a follow mutation when an account bridge is active", async () => {
    const user = userEvent.setup();
    const syncFollow = vi.fn(async () => ({ ok: true as const }));
    render(
      <FollowedNichesProvider knownNicheIds={["books"]} syncFollow={syncFollow}>
        <FollowButton nicheId="books" nicheName="Books" />
      </FollowedNichesProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Start larping in Books" }));
    expect(syncFollow).toHaveBeenCalledWith("books", true);
  });

  it("keeps defaults when stored preferences cannot be read", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    render(
      <FollowedNichesProvider knownNicheIds={["fragrance", "mechanical-keyboards"]}>
        <FollowButton nicheId="fragrance" nicheName="Fragrance" />
      </FollowedNichesProvider>,
    );

    expect(await screen.findByRole("button", { name: "Stop larping in Fragrance" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps follow controls working when preferences cannot be written", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    render(
      <FollowedNichesProvider knownNicheIds={["fragrance", "mechanical-keyboards"]}>
        <FollowButton nicheId="mechanical-keyboards" nicheName="Mechanical Keyboards" />
      </FollowedNichesProvider>,
    );

    const button = screen.getByRole("button", { name: "Start larping in Mechanical Keyboards" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Mechanical Keyboards added to Your Larps");
  });
});
