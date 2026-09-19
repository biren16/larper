import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { FollowedNichesProvider } from "./followed-niches-provider";
import { FollowButton } from "./follow-button";
import { PREFERENCES_STORAGE_KEY } from "@/domain/preferences/preferences";

describe("FollowButton", () => {
  beforeEach(() => window.localStorage.clear());

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
});

