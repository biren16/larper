import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudioDashboard } from "./studio-dashboard";

describe("StudioDashboard", () => {
  it("puts the founder's evidence inbox ahead of the editorial queue", () => {
    render(<StudioDashboard data={{
      candidates: [{ id: "cluster-1", title: "F1 books cross feeds", nicheName: "Books", heat: 84, confidence: 88, state: "reviewing", sourceCount: 3, lastCheckedAt: "2026-09-20T10:00:00.000Z", sensitiveFlags: [] }],
      sources: [
        { id: "source-1", name: "Culture Desk", adapterType: "rss", active: true, healthy: true, lastPolledAt: "2026-09-20T09:00:00.000Z", failureCount: 0, trustTier: "publication", status: "live" },
        { id: "source-2", name: "Google Trends validation", adapterType: "trend", active: false, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "watchlist", status: "waiting" },
      ],
      runs: [{ id: "run-1", status: "succeeded", startedAt: "2026-09-20T09:00:00.000Z", insertedCount: 4, errorCount: 0 }],
      recentSignals: [],
    }} />);

    expect(screen.getByRole("heading", { name: "Signal desk" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add a signal" })).toBeInTheDocument();
    expect(screen.getByText("Paste a public link. Add what you are seeing. The desk keeps the receipts.")).toBeInTheDocument();
    expect(screen.getByText("Evidence inbox")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "F1 books cross feeds" })).toBeInTheDocument();
    expect(screen.getByText("84 heat")).toBeInTheDocument();
    expect(screen.getByText("Culture Desk")).toBeInTheDocument();
    expect(screen.getByText("4 new signals in the latest run")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Add a manual signal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Niche")).toBeInTheDocument();
    expect(screen.getByText("Your read on the moment")).toBeInTheDocument();
    expect(screen.getByText("Waiting for official API access")).toBeInTheDocument();
  });
});
