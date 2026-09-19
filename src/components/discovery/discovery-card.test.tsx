import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedRepository } from "@/data/seed/repository";
import { buildDiscoveryHome, type TopicViewModel } from "@/domain/discovery/services";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";
import { DiscoveryCard } from "./discovery-card";

async function topicOfType(type: TopicViewModel["topic"]["type"]) {
  const home = await buildDiscoveryHome(seedRepository, DEFAULT_FOLLOWED_NICHE_IDS);
  return [...home.currentTopics, ...home.deepLore].find((item) => item.topic.type === type)!;
}

describe("DiscoveryCard", () => {
  it("presents a meme as a lightweight internet moment with an immediate explainer", async () => {
    const item = await topicOfType("MEME");
    render(<DiscoveryCard item={item} kind="meme" />);

    expect(screen.getByRole("article")).toHaveAttribute("data-card-kind", "meme");
    expect(screen.getByRole("heading", { name: item.topic.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WTF is this?" })).toHaveAttribute(
      "href",
      `/discover/${item.topic.slug}#beginner-context`,
    );
    expect(screen.getByText(`${item.sourceCount} signals`)).toBeInTheDocument();
  });

  it("gives debates a direct path to why the argument matters", async () => {
    const item = await topicOfType("DEBATE");
    render(<DiscoveryCard item={item} kind="debate" />);

    expect(screen.getByRole("link", { name: "Why do people care?" })).toHaveAttribute(
      "href",
      `/discover/${item.topic.slug}#why-it-matters`,
    );
  });

  it("keeps a useful typographic treatment when artwork is missing", async () => {
    const item = { ...(await topicOfType("TREND")), media: null };
    render(<DiscoveryCard item={item} kind="visual" />);

    expect(screen.getByText("LARPer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Open ${item.topic.title}` })).toBeInTheDocument();
  });
});
