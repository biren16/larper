import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { buildNichePage } from "@/domain/discovery/services";
import { seedRepository } from "@/data/seed/repository";
import { getCachedNichePage } from "@/data/discovery-cache";
import { FollowedNichesProvider } from "@/components/preferences/followed-niches-provider";
import NichePage from "./page";
vi.mock("@/data/discovery-cache", () => ({ getCachedNichePage: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));
let base: NonNullable<Awaited<ReturnType<typeof getCachedNichePage>>>;
beforeEach(async () => {
  const page = (await buildNichePage(seedRepository, "sneakers", []))!;
  const item = page.currentTopics[0] ?? page.deepLore[0];
  const topic = (slug: string, tags: string[], mode: "current" | "deep-lore") => ({ ...item, topic: { ...item.topic, id: slug, slug, title: slug, nicheId: "style", tags, mode } });
  base = { ...page, niche: { ...page.niche, id: "style", slug: "style", name: "Style" }, currentTopics: [topic("sneaker-current", ["sneakers"], "current"), topic("street-current", ["streetwear"], "current")], deepLore: [topic("overlap-lore", ["sneakers", "streetwear"], "deep-lore")] };
  vi.mocked(getCachedNichePage).mockResolvedValue(base);
});
async function show(subtopic: string) {
  render(<FollowedNichesProvider>{await NichePage({ params: Promise.resolve({ slug: "style" }), searchParams: Promise.resolve({ subtopic }) })}</FollowedNichesProvider>);
}
it.each(["sneakers", "streetwear"])("filters both current stories and deep lore for %s without changing the cached dataset or follow", async (subtopic) => {
  await show(subtopic);
  const nav = screen.getByRole("navigation", { name: "Style subtopics" });
  expect(within(nav).getByRole("link", { name: subtopic === "sneakers" ? "Sneakers" : "Streetwear" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("heading", { name: "overlap-lore" })).toBeVisible();
  expect(screen.queryByRole("heading", { name: subtopic === "sneakers" ? "street-current" : "sneaker-current" })).toBeNull();
  expect(screen.getByRole("button", { name: "Start larping in Style" })).toBeVisible();
  expect(base.currentTopics).toHaveLength(2);
});
it("falls back to All Style for unknown filters", async () => {
  await show("unknown");
  expect(screen.getByRole("link", { name: "All Style" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("heading", { name: "sneaker-current" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "street-current" })).toBeVisible();
});
it("shows an honest empty state", async () => {
  base.currentTopics = []; base.deepLore = [];
  await show("sneakers");
  expect(within(screen.getByRole("main")).getByRole("status")).toHaveTextContent("No published sneakers stories yet");
  expect(screen.queryByRole("heading", { name: "Learn the lore" })).toBeNull();
});
