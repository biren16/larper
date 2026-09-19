import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedRepository } from "@/data/seed/repository";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";
import { buildDiscoveryHome } from "@/domain/discovery/services";
import { FollowedNichesProvider } from "@/components/preferences/followed-niches-provider";
import { DiscoveryHome } from "./discovery-home";

describe("DiscoveryHome", () => {
  it("puts the internet-obsessions proposition and a varied live feed first", async () => {
    const home = await buildDiscoveryHome(seedRepository, DEFAULT_FOLLOWED_NICHE_IDS);
    render(
      <FollowedNichesProvider knownNicheIds={home.niches.map((niche) => niche.id)}>
        <DiscoveryHome home={home} />
      </FollowedNichesProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /what the internet is larping rn/i })).toBeInTheDocument();
    expect(screen.getByText(/niche obsessions, drops, memes, debates and lore/i)).toBeInTheDocument();
    const nowHeading = screen.getByRole("heading", { name: "Larping RN" });
    const nowSection = nowHeading.closest("section");
    expect(nowSection).not.toBeNull();
    expect(within(nowSection!).getAllByRole("article")).toHaveLength(7);
    expect(within(nowSection!).getAllByRole("link", { name: /go deeper|wtf is this|why do people care/i }).length).toBeGreaterThan(3);
    expect(screen.getByRole("heading", { name: "Your Larps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Go larp something new" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missed the origin story?" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /silver runners are back in rotation/i }).length).toBeGreaterThan(0);
  });
});
