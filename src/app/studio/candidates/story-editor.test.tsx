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
    expect(screen.getByRole("checkbox", { name: /independent original sources/i })).toBeRequired();
    expect(screen.getAllByRole("link", { name: /Open source/ })).toHaveLength(2);
    expect(screen.getByText("2 signals", { selector: "span" })).toBeInTheDocument();
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
    expect(screen.getByText("2 signals", { selector: "span" })).toBeInTheDocument();
  });

  it("offers an approved cover with credit and an upload form", () => {
    render(<StoryEditor candidate={{ ...candidate, mediaId: "asset-1", mediaOptions: [{ id: "asset-1", alt: "Race car", creditLine: "Photo by Artist" }] }} uploadMediaAction={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Story image" })).toHaveValue("asset-1");
    expect(screen.getAllByText(/Photo by Artist/).length).toBeGreaterThan(0);
    expect(screen.getByRole("form", { name: "Upload approved image" })).toBeInTheDocument();
    expect(screen.getByLabelText("Image file (JPEG, PNG or WebP, up to 10 MB)")).toBeInTheDocument();
  });
});

it("reloads a saved Style draft with named subtopics and fresh publication confirmation", () => {
  render(<StoryEditor candidate={{ ...candidate, nicheId: "style", storyLifecycle: "reviewing", draft: {
    nicheId: "style", slug: "samba-lore", title: "The Samba archive", hook: "Saved hook", summary: "Saved summary", whyItMatters: "Saved context", lore: "Saved lore", beginnerContext: "Saved beginner context", conversationLine: "Saved chat line", discoveryType: "LORE", mode: "deep-lore", regions: ["global"], freshnessLabel: "Archive", evidenceSummary: "Saved receipts", independentSourcesConfirmed: false, tags: ["sneakers", "streetwear"],
  } }} saveDraftAction={() => undefined} />);
  expect(screen.getByLabelText("Hook")).toHaveValue("Saved hook");
  expect(screen.getByLabelText("Slug")).toHaveValue("samba-lore");
  expect(screen.getByLabelText("Mode")).toHaveValue("deep-lore");
  expect(screen.getByRole("checkbox", { name: "Sneakers" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Streetwear" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /independent original sources/i })).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Save draft" })).toHaveAttribute("formnovalidate");
});

it("offers private draft saving for a published story", () => {
  render(<StoryEditor candidate={{ ...candidate, storyLifecycle: "published_story" }} saveDraftAction={() => undefined} />);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
});

it("links a published story and hides evidence editing and scheduling until unpublish", () => {
  render(<StoryEditor candidate={{ ...candidate, storyLifecycle: "published_story", draft: { nicheId: "music", slug: "live-story", title: "Live story", hook: "Hook", summary: "Summary", whyItMatters: "Context", lore: "Lore", beginnerContext: "Beginner", conversationLine: "Line", discoveryType: "LORE", mode: "deep-lore", regions: ["global"], freshnessLabel: "Archive", evidenceSummary: "Receipts", independentSourcesConfirmed: false, tags: [] } }} scheduleAction={() => undefined} mergeAction={() => undefined} splitAction={() => undefined} />);
  expect(screen.getByRole("link", { name: "View public story" })).toHaveAttribute("href", "/discover/live-story");
  expect(screen.queryByRole("button", { name: /^Schedule$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Merge into this cluster" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Split evidence" })).not.toBeInTheDocument();
});

it("names an existing schedule's time change explicitly", () => {
  render(<StoryEditor candidate={{ ...candidate, scheduledFor: "2050-01-01T00:00:00Z" }} scheduleAction={() => undefined} />);
  expect(screen.getByRole("button", { name: "Reschedule" })).toHaveAttribute("value", "schedule");
  expect(screen.queryByRole("button", { name: "Schedule" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Update scheduled version" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel schedule" })).toBeInTheDocument();
});

it("uses named classification, editable tag controls and selectable cluster evidence", async () => {
  render(<StoryEditor candidate={{ ...candidate, niches: [{id:'books',name:'Books'}], mergeCandidates:[{id:'other',title:'A matching reading list'}] }} mergeAction={() => undefined} splitAction={() => undefined} />);
  expect(screen.getByRole('combobox',{name:'Niche'})).toHaveValue('books');
  expect(screen.getByRole('option',{name:'Books'})).toBeInTheDocument();
  expect(screen.getByRole('textbox',{name:'Add tag'})).toBeInTheDocument();
  expect(screen.getByRole('searchbox',{name:'Search candidates'})).toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:'Reading list spreads · Culture Desk'})).toHaveAttribute('value','signal-1');
  expect(screen.getByRole('heading',{name:'Publication checklist'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Choose a niche'})).toHaveAttribute('href','#field-nicheId');
});

it('keeps shared public preview current and offers a real mobile viewport',async()=>{
 const {fireEvent,waitFor}=await import('@testing-library/react');
 render(<StoryEditor candidate={candidate} />);
 fireEvent.click(screen.getByRole('button',{name:'Preview public story'}));
 const frame=screen.getByTitle('Public story preview') as HTMLIFrameElement;
 fireEvent.load(frame);
 fireEvent.change(screen.getByLabelText('Hook'),{target:{value:'Current unsaved hook'}});
 await waitFor(()=>expect(within(frame.contentDocument!.body).getByText('Current unsaved hook')).toBeInTheDocument());
 expect(within(frame.contentDocument!.body).getByRole('heading',{name:'Source signals'})).toBeInTheDocument();
 expect(within(frame.contentDocument!.body).getByRole('link',{name:/Culture Desk/})).toHaveAttribute('href','https://example.com/a');
 fireEvent.click(screen.getByRole('button',{name:'Mobile'}));
 expect(frame).toHaveStyle({width:'390px'});
});
