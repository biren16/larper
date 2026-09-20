import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoryEditor } from "./story-editor";

describe("StoryEditor", () => {
  it("exposes the complete premium story structure and evidence controls", () => {
    render(<StoryEditor candidate={{
      id: "cluster-1",
      title: "F1 books cross feeds",
      nicheId: "books",
      heat: 84,
      confidence: 88,
      sensitiveFlags: [],
      evidence: [
        { id: "signal-1", title: "Reading list spreads", sourceName: "Culture Desk", sourceUrl: "https://example.com/a", trustTier: "publication", availability: "available" },
        { id: "signal-2", title: "Fans compare titles", sourceName: "Grid Forum", sourceUrl: "https://example.com/b", trustTier: "community", availability: "available" },
      ],
    }} />);

    expect(screen.getByRole("heading", { name: "F1 books cross feeds" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hook")).toBeRequired();
    expect(screen.getByLabelText("What happened?")).toBeRequired();
    expect(screen.getByLabelText("Why people care")).toBeRequired();
    expect(screen.getByLabelText("The lore")).toBeRequired();
    expect(screen.getByLabelText("If you’re new")).toBeRequired();
    expect(screen.getByRole("button", { name: "Publish story" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open source/ })).toHaveLength(2);
  });
});
