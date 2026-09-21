import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoryEditor, type StudioCandidateDetail } from "./story-editor";

const candidate: StudioCandidateDetail = {
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
};

describe("StoryEditor", () => {
  it("organizes writing into Story, Context, Classification, and Evidence groups", () => {
    render(<StoryEditor candidate={candidate} />);

    const story = screen.getByRole("group", { name: "Story" });
    expect(within(story).getByLabelText("Title")).toBeRequired();
    expect(within(story).getByLabelText("Hook")).toBeRequired();
    expect(within(story).getByLabelText("What happened?")).toBeRequired();

    const context = screen.getByRole("group", { name: "Context" });
    expect(within(context).getByLabelText("Why people care")).toBeRequired();
    expect(within(context).getByLabelText("The lore")).toBeRequired();
    expect(within(context).getByLabelText("If you’re new")).toBeRequired();

    expect(screen.getByRole("group", { name: "Classification" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Evidence summary" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open source/ })).toHaveLength(2);
  });

  it("keeps publication controls stable and separates destructive cluster actions", () => {
    render(<StoryEditor candidate={candidate} publishAction={() => undefined} scheduleAction={() => undefined} transitionAction={() => undefined} mergeAction={() => undefined} splitAction={() => undefined} />);

    const publication = screen.getByRole("group", { name: "Publication actions" });
    expect(within(publication).getByRole("button", { name: "Publish story" })).toBeInTheDocument();
    expect(within(publication).getByRole("button", { name: "Publish brief" })).toBeInTheDocument();
    expect(within(publication).getByRole("button", { name: "Schedule" })).toBeInTheDocument();

    const more = screen.getByRole("group", { name: "More actions" });
    expect(within(more).getByRole("button", { name: "Merge into this cluster" })).toBeInTheDocument();
    expect(within(more).getByRole("button", { name: "Split evidence" })).toBeInTheDocument();
    expect(within(more).getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("keeps sensitive-review status visible beside candidate metrics", () => {
    render(<StoryEditor candidate={{ ...candidate, sensitiveFlags: ["minors"] }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Mandatory review");
    expect(screen.getByText("minors")).toBeInTheDocument();
    expect(screen.getByText("2 signals")).toBeInTheDocument();
  });
});
