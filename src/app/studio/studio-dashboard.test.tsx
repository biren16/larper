import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StudioDashboard, type StudioDashboardData } from "./studio-dashboard";
import { SignalComposer } from "./signal-composer";
import { StatusNotice } from "./status-notice";

const data: StudioDashboardData = {
  niches: [{ id: "books", name: "Books" }],
  candidates: [{ id: "cluster-1", title: "F1 books cross feeds", nicheName: "Books", heat: 84, confidence: 88, state: "reviewing", sourceCount: 3, lastCheckedAt: "2026-09-20T10:00:00.000Z", sensitiveFlags: [] }],
  sources: [
    { id: "source-1", name: "Culture Desk", adapterType: "rss", watchlistBeat: "books", active: true, healthy: true, lastPolledAt: "2026-09-20T09:00:00.000Z", failureCount: 0, trustTier: "publication", status: "live" },
    { id: "source-2", name: "Google Trends validation", adapterType: "trend", watchlistBeat: "tech-gaming", active: false, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "watchlist", status: "waiting" },
    { id: "source-3", name: "Screen Daily", adapterType: "rss", watchlistBeat: "screen-culture", active: true, healthy: true, lastPolledAt: "2026-09-20T09:00:00.000Z", failureCount: 0, trustTier: "publication", status: "live" },
  ],
  runs: [{ id: "run-1", status: "succeeded", startedAt: "2026-09-20T09:00:00.000Z", insertedCount: 4, errorCount: 0 }],
  recentSignals: [{ id: "signal-1", title: "Grid reading lists are spreading", canonicalUrl: "https://example.com/signal", sourceName: "Culture Desk", sourceType: "rss", nicheName: "Books", region: "india", observedAt: "2026-09-20T10:15:00.000Z", availability: "available", clusterId: "cluster-1" }],
};

describe("StudioDashboard", () => {
  it("keeps the review queue first and shows recent evidence with a separate watchlist route", () => {
    render(<StudioDashboard data={data} />);

    const queue = screen.getByRole("region", { name: "Review queue" });
    const composer = screen.getByRole("region", { name: "Add a signal" });
    expect(queue.compareDocumentPosition(composer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Studio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "F1 books cross feeds" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recently captured" })).toBeInTheDocument();
    expect(screen.getByText("Grid reading lists are spreading")).toBeInTheDocument();
    expect(screen.getByText(/Culture Desk/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage sources" })).toHaveAttribute("href", "/studio/sources");
    expect(screen.getByText("Screen culture")).toBeInTheDocument();
  });

  it("turns an empty queue into a direct capture action", async () => {
    const user = userEvent.setup();
    render(<StudioDashboard data={{ ...data, candidates: [] }} />);

    expect(screen.getByText("The desk is clear.")).toBeInTheDocument();
    const action = screen.getByRole("link", { name: "Add first signal" });
    expect(action).toHaveAttribute("href", "#signal-composer");
    await user.click(action);
    expect(screen.getByRole("dialog", { name: "Add a signal" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close signal composer" }));
    expect(action).toHaveFocus();
  });

  it("always keeps the original public source link on captured evidence", () => {
    render(<StudioDashboard data={data} />);

    expect(screen.getByRole("link", { name: "Open captured source" })).toHaveAttribute("href", "https://example.com/signal");
    expect(screen.getByRole("link", { name: "Open candidate" })).toHaveAttribute("href", "/studio/candidates/cluster-1");
  });
});

describe("SignalComposer", () => {
  it("opens for mobile capture, moves focus inside, and returns focus when closed", async () => {
    const user = userEvent.setup();
    render(<SignalComposer niches={data.niches ?? []} />);
    const launcher = screen.getByRole("button", { name: "Add signal" });

    await user.click(launcher);
    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Add a signal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Public URL")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close signal composer" }));
    expect(launcher).toHaveFocus();
    expect(launcher).toHaveAttribute("aria-expanded", "false");
  });

  it("traps keyboard focus while open", async () => {
    const user = userEvent.setup();
    render(<SignalComposer niches={data.niches ?? []} />);
    await user.click(screen.getByRole("button", { name: "Add signal" }));

    const submit = screen.getByRole("button", { name: "Add to evidence inbox" });
    submit.focus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close signal composer" })).toHaveFocus();
  });
});

describe("StatusNotice", () => {
  it("turns controlled notice codes and action errors into live feedback", () => {
    const { rerender } = render(<StatusNotice notice="signal-added" />);
    expect(screen.getByRole("status")).toHaveTextContent("Signal added to the evidence inbox.");

    rerender(<StatusNotice error="The source could not be reached" />);
    expect(screen.getByRole("alert")).toHaveTextContent("The source could not be reached");

    rerender(<StatusNotice notice="story-published" />);
    expect(screen.getByRole("status")).toHaveTextContent("Story published to discovery.");
  });
});
