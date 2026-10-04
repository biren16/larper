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
    { id: "manual", name: "Founder manual intake", adapterType: "manual", watchlistBeat: "internet-culture", active: true, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "watchlist", status: "manual" },
    { id: "pending", name: "New feed", adapterType: "rss", watchlistBeat: "books", active: true, healthy: false, lastPolledAt: null, failureCount: 0, trustTier: "publication", status: "pending" },
  ],
  runs: [{ id: "run-1", status: "partial", startedAt: "2026-09-21T08:00:00Z", insertedCount: 7, errorCount: 2 }],
};

describe("SourceManager", () => {
  it("groups watchlists by beat and explains all four operational states", () => {
    render(<SourceManager data={data} />);

    for (const beat of ["F1", "Books", "Music", "Screen Culture", "Gaming & Tech", "Internet Culture"]) {
      expect(screen.getByRole("heading", { name: beat })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Live").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Paused").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("First collection pending")).toBeInTheDocument();
    expect(screen.getByText("Manual intake")).toBeInTheDocument();
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
    expect(screen.getByRole("option", { name: "Screen Culture" })).toHaveValue("screen-culture");
  });
});

it("offers all seven beats and usage review before paused-feed activation", () => {
  render(<SourceManager data={data} createSourceAction={() => undefined} toggleSourceAction={() => undefined} reviewSourceAction={() => undefined} registerPresetsAction={() => undefined} />);
  expect(screen.getByRole("option", { name: "Style" })).toHaveValue("style");
  expect(screen.getByRole("option", { name: "Internet Culture" })).toHaveValue("internet-culture");
  expect(screen.getByRole("button", { name: "Register seven-lane sources" })).toBeInTheDocument();
  const books = screen.getByRole("region", { name: "Books" });
  expect(within(books).getByRole("button", { name: "Activate Book channel" })).toBeDisabled();
  expect(within(books).getByRole("form", { name: "Review usage for Book channel" })).toBeInTheDocument();
});

it('prioritises unresolved failures with actual reasons and records setup completion',()=>{
 render(<SourceManager data={{...data,registration:{registered:25,expected:25},sources:data.sources.map(source=>({...source,usageReviewed:true,expectedNextPollAt:'2026-09-21T10:00:00Z',failures:source.id==='music'?[{message:'Publisher returned HTTP 403',code:'HTTP_403',occurredAt:'2026-09-21T08:00:00Z'}]:[]}))}} registerPresetsAction={()=>undefined} />);
 expect(screen.getByText(/publisher blocked collection/i)).toBeInTheDocument();
 expect(screen.getByText(/Publisher returned HTTP 403/)).toBeInTheDocument();
 expect(screen.getByText('25 of 25 sources registered')).toBeInTheDocument();
 expect(screen.getByText('Setup controls')).toBeInTheDocument();
 expect(screen.getAllByText('Expected next collection').length).toBeGreaterThan(0);
});

it('summarises repeated failures and lets the admin filter sources without losing diagnostics',async()=>{
 const user=(await import('@testing-library/user-event')).default.setup();
 render(<SourceManager data={{...data,sources:data.sources.map(source=>({...source,usageReviewed:true,failures:source.id==='music'?Array.from({length:13},()=>({message:"Encountered redirect while redirect mode is set to 'error'",code:'FETCH_FAILED',occurredAt:'2026-09-21T08:00:00Z'})):[]}))}} />);
 expect(screen.queryByRole('region',{name:'Source priorities'})).not.toBeInTheDocument();
 await user.type(screen.getByRole('textbox',{name:'Search sources'}),'Music');
 expect(screen.getByRole('heading',{name:'Music desk'})).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'F1 newsroom'})).not.toBeInTheDocument();
 expect(screen.getByText(/feed URL redirects/i)).toBeInTheDocument();
 expect(screen.getByText(/13 occurrences/)).toBeInTheDocument();
});
