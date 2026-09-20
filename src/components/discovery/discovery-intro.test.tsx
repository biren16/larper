import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { seedRepository } from "@/data/seed/repository";
import { buildDiscoveryHome } from "@/domain/discovery/services";

import { DISCOVERY_INTRO_STORAGE_KEY, DiscoveryIntro } from "./discovery-intro";

describe("DiscoveryIntro", () => {
  it("keeps the cinematic layer decorative and dismissible without utility labels", async () => {
    window.sessionStorage.removeItem(DISCOVERY_INTRO_STORAGE_KEY);
    const home = await buildDiscoveryHome(seedRepository, []);
    const { container } = render(<DiscoveryIntro items={home.currentTopics.slice(0, 3)} />);

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip intro" })).not.toBeInTheDocument();
    expect(screen.queryByText("Signal incoming")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(container).toBeEmptyDOMElement(), { timeout: 600 });
  });
});
