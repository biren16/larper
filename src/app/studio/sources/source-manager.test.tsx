import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceManager } from "./source-manager";
import type { StudioSourcesData } from "../studio-dashboard";

const data: StudioSourcesData = {
  sources: [
    { id: "f1", name: "F1 newsroom", adapterType: "rss", watchlistBeat: "f1", active: true, healthy: true, lastPolledAt: "2026-09-21T08:00:00Z", failureCount: 0, trustTier: "publication", status: "live" },
    { id: "books", name: "Book channel", adapterType: "youtube", watchlistBeat: "books", active: false, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "primary", status: "paused" },
    { id: "music", name: "Music desk", adapterType: "rss", watchlistBeat: "music", active: true, healthy: false, lastPolledAt: "2026-09-21T07:00:00Z", failureCount: 2, trustTier: "publication", status: "attention" },
    { id: "screen", name: "Screen desk", adapterType: "rss", watchlistBeat: "screen-culture", active: true, healthy: true, lastPolledAt: "2026-09-21T06:00:00Z", failureCount: 0, trustTier: "publication", status: "live" },
    { id: "tech", name: "Trends validation", adapterType: "trend", watchlistBeat: "tech-gaming", active: false, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "watchlist", status: "waiting" },
    { id: "manual", name: "Founder manual intake", adapterType: "manual", watchlistBeat: "internet-culture", active: true, healthy: true, lastPolledAt: null, failureCount: 0, trustTier: "watchlist", status: "live" },
  ],
  runs: [{ id: "run-1", status: "partial", startedAt: "2026-09-21T08:00:00Z", insertedCount: 7, errorCount: 2 }],
};

describe("SourceManager", () => {
  it("groups watchlists by beat and explains all four operational states", () => {
    render(<SourceManager data={data} />);

    for (const beat of ["F1", "Books", "Music", "Screen culture", "Tech + gaming", "Internet culture"]) {
      expect(screen.getByRole("heading", { name: beat })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
    expect(screen.getByText("Paused")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("2 unresolved failures")).toBeInTheDocument();
  });

  it("offers activation for paused sources and sends manual culture capture back to Studio", () => {
    render(<SourceManager data={data} toggleSourceAction={() => undefined} />);

    const books = screen.getByRole("region", { name: "Books" });
    expect(within(books).getByRole("button", { name: "Activate Book channel" })).toBeInTheDocument();
    const f1 = screen.getByRole("region", { name: "F1" });
    expect(within(f1).getByRole("button", { name: "Pause F1 newsroom" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Capture an internet signal" })).toHaveAttribute("href", "/studio#signal-composer");
  });

  it("keeps source configuration and collection runs focused and legible", () => {
    render(<SourceManager data={data} createSourceAction={() => undefined} />);

    expect(screen.getByRole("form", { name: "Add a source" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent collection runs" })).toBeInTheDocument();
    expect(screen.getByText("7 added")).toBeInTheDocument();
    expect(screen.getByText("2 errors")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Screen culture" })).toHaveValue("screen-culture");
  });
});
