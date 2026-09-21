import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudioDashboard } from "./studio-dashboard";

describe("StudioDashboard", () => {
  it("presents queue evidence, source health, and ingestion status accessibly", () => {
    render(<StudioDashboard data={{
      candidates: [{ id: "cluster-1", title: "F1 books cross feeds", nicheName: "Books", heat: 84, confidence: 88, state: "reviewing", sourceCount: 3, lastCheckedAt: "2026-09-20T10:00:00.000Z", sensitiveFlags: [] }],
      sources: [{ id: "source-1", name: "Culture Desk", adapterType: "rss", active: true, healthy: true, lastPolledAt: "2026-09-20T09:00:00.000Z", failureCount: 0 }],
      runs: [{ id: "run-1", status: "succeeded", startedAt: "2026-09-20T09:00:00.000Z", insertedCount: 4, errorCount: 0 }],
    }} />);

    expect(screen.getByRole("heading", { name: "Editorial radar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "F1 books cross feeds" })).toBeInTheDocument();
    expect(screen.getByText("84 heat")).toBeInTheDocument();
    expect(screen.getByText("Culture Desk")).toBeInTheDocument();
    expect(screen.getByText("Last run succeeded")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Add a manual signal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Niche")).toBeInTheDocument();
  });
});
