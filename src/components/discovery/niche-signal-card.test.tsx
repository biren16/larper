import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { seedRepository } from "@/data/seed/repository";
import { buildNichePage } from "@/domain/discovery/services";

import { NicheSignalCard, type NicheSignalLayout } from "./niche-signal-card";

async function getItem(layout: NicheSignalLayout) {
  const page = await buildNichePage(seedRepository, "sneakers", []);
  if (!page) throw new Error("Expected seeded niche");
  return layout === "lore" ? page.deepLore[0] : page.currentTopics[0];
}

describe("NicheSignalCard", () => {
  it.each<NicheSignalLayout>(["lead", "feed", "lore"])(
    "renders the %s layout as an accessible story",
    async (layout) => {
      const item = await getItem(layout);
      render(<NicheSignalCard item={item} layout={layout} />);

      expect(screen.getByRole("article")).toHaveAttribute("data-niche-layout", layout);
      expect(screen.getByRole("heading", { name: item.topic.title })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: item.topic.title })).toHaveAttribute(
        "href",
        `/discover/${item.topic.slug}`,
      );
      expect(screen.getByText(`${item.sourceCount} signals`)).toBeInTheDocument();
    },
  );

  it("preserves the designed fallback when topic artwork is missing", async () => {
    const item = { ...(await getItem("lead")), media: null };
    render(<NicheSignalCard item={item} layout="lead" />);

    expect(screen.getByText("LARPer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `Open ${item.topic.title}` })).toBeInTheDocument();
  });

  it("sends lore readers directly to the explanation", async () => {
    const item = await getItem("lore");
    render(<NicheSignalCard item={item} layout="lore" />);

    expect(screen.getByRole("link", { name: "Explain the lore" })).toHaveAttribute(
      "href",
      `/discover/${item.topic.slug}#lore`,
    );
  });
});
