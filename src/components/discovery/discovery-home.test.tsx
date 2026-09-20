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

    expect(screen.getByRole("heading", { level: 1, name: "Wanna larp bout smth ? Find a niche rn." })).toBeInTheDocument();
    expect(screen.getByText(/niche obsessions, drops, memes, debates and lore/i)).toBeInTheDocument();
    const hero = screen.getByLabelText("Current ranked culture signals");
    const heroSignals = within(hero).getAllByRole("link");
    expect(heroSignals).toHaveLength(3);
    home.currentTopics.slice(0, 3).forEach((item) => {
      expect(within(hero).getByRole("link", { name: `Open ${item.topic.title}` })).toHaveAttribute(
        "href",
        `/discover/${item.topic.slug}`,
      );
    });
    const nowHeading = screen.getByRole("heading", { name: "Larping RN" });
    const nowSection = nowHeading.closest("section");
    expect(nowSection).not.toBeNull();
    const nowStories = within(nowSection!).getAllByRole("article");
    expect(nowStories).toHaveLength(7);
    expect(within(nowStories[0]).getByRole("heading", { name: currentTopicsTitle(home, 0) })).toBeInTheDocument();
    nowStories.slice(1, 5).forEach((story, index) => {
      expect(within(story).getByRole("heading", { name: currentTopicsTitle(home, index + 1) })).toBeInTheDocument();
      expect(within(story).getByText(`${home.currentTopics[index + 1].sourceCount} signals`)).toBeInTheDocument();
    });
    expect(within(nowSection!).getAllByRole("link", { name: /go deeper|wtf is this|why do people care/i }).length).toBeGreaterThan(3);
    expect(screen.getByRole("heading", { name: "Your Larps" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Go larp something new" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missed the origin story?" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /silver runners are back in rotation/i }).length).toBeGreaterThan(0);
  });
});

function currentTopicsTitle(home: Awaited<ReturnType<typeof buildDiscoveryHome>>, index: number) {
  return home.currentTopics[index].topic.title;
}
