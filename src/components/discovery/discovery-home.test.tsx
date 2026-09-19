import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedRepository } from "@/data/seed/repository";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";
import { buildDiscoveryHome } from "@/domain/discovery/services";
import { FollowedNichesProvider } from "@/components/preferences/followed-niches-provider";
import { DiscoveryHome } from "./discovery-home";

describe("DiscoveryHome", () => {
  it("makes the current-obsessions and lore proposition obvious", async () => {
    const home = await buildDiscoveryHome(seedRepository, DEFAULT_FOLLOWED_NICHE_IDS);
    render(
      <FollowedNichesProvider knownNicheIds={home.niches.map((niche) => niche.id)}>
        <DiscoveryHome home={home} />
      </FollowedNichesProvider>,
    );

    expect(screen.getByRole("heading", { level: 1, name: /what niche communities are obsessed with right now/i })).toBeInTheDocument();
    expect(screen.getByText(/open the story, get the context/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Larping RN" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your Larps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Go larp something new" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deep lore" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /silver runners are back in rotation/i }).length).toBeGreaterThan(0);
  });
});

