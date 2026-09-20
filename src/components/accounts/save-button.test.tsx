import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/account/actions", () => ({ setSavedAction: vi.fn() }));
import { SaveButton } from "./save-button";

describe("SaveButton", () => {
  it("optimistically saves and confirms the server result", async () => {
    const user = userEvent.setup();
    const setSaved = vi.fn(async () => ({ ok: true as const, saved: true }));
    render(<SaveButton storyId="story-1" initialSaved={false} setSaved={setSaved} />);
    await user.click(screen.getByRole("button", { name: "Save story" }));
    expect(setSaved).toHaveBeenCalledWith("story-1", true);
    expect(screen.getByRole("button", { name: "Remove saved story" })).toHaveAttribute("aria-pressed", "true");
  });
});
