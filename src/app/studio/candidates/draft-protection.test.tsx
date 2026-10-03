import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StoryEditor } from "./story-editor";
const candidate = { id: "protected-1", accountId: "founder-1", environment: "test", editorialVersion: 3, title: "Draft", nicheId: null, heat: 0, confidence: 0, sensitiveFlags: [], evidence: [] };
describe("private writing protection", () => {
 it("saves incomplete writing after inactivity and preserves values on failure", async () => {
  const save = vi.fn(async (data: FormData) => ({ ok: false as const, error: data.get("candidateId") ? "Offline" : "Missing candidate" }));
  render(<StoryEditor candidate={candidate} saveDraftAction={save} />);
  fireEvent.change(screen.getByLabelText("Hook"), { target: { value: "Unfinished writing" } });
  await waitFor(() => expect(save).toHaveBeenCalled(), { timeout: 2000 });
  expect(screen.getByLabelText("Hook")).toHaveValue("Unfinished writing");
  expect(screen.getByRole("status")).toHaveTextContent("Save failed");
  expect(save.mock.calls[0]![0].get("editorialVersion")).toBe("3");
  expect(sessionStorage.getItem("larper-draft:test:founder-1:protected-1")).toContain("Unfinished writing");
 });
 it("keeps live draft save available", () => {
  render(<StoryEditor candidate={{ ...candidate, id: "live", storyLifecycle: "published_story" }} saveDraftAction={async () => ({ ok: true, revision: 4 })} />);
  expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Update live post" })).toBeInTheDocument();
 });
});
it("clears saved recovery and keeps publication errors in the editor", async () => {
 const save=vi.fn(async (data: FormData)=>({ok:true,revision:Number(data.get("editorialVersion"))+1}));
 const publish=vi.fn(async ()=>({ok:false,error:"Review required"}));
 render(<StoryEditor candidate={{...candidate,id:"publication-error"}} saveDraftAction={save} publishAction={publish} />);
 fireEvent.change(screen.getByLabelText("Hook"),{target:{value:"My writing"}});
 fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Saved"));
 expect(sessionStorage.getItem("larper-draft:test:founder-1:publication-error")).toBeNull();
 // Brief submit bypasses native required fields so the real action can return review blockers.
 fireEvent.submit(screen.getByRole("form",{name:"Story editor"}));
 await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Review required"));
 expect(screen.getByLabelText("Hook")).toHaveValue("My writing");
});
it("offers recovery and retains its writing when an upload fails", async () => {
 const key="larper-draft:test:founder-1:upload-error";
 sessionStorage.setItem(key,JSON.stringify({hook:["Recovered draft"]}));
 render(<StoryEditor candidate={{...candidate,id:"upload-error"}} uploadMediaAction={async ()=>({ok:false,error:"Image rejected"})} />);
 await waitFor(()=>expect(screen.getByRole("button",{name:"Recover writing"})).toBeInTheDocument());
 fireEvent.click(screen.getByRole("button",{name:"Recover writing"}));
 fireEvent.submit(screen.getByRole("form",{name:"Upload approved image"}));
 await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("Image rejected"));
 expect(screen.getByLabelText("Hook")).toHaveValue("Recovered draft");
});
it("does not overwrite typing entered during a save", async () => {
 let complete!: (value:{ok:boolean;revision:number})=>void;
 const save=vi.fn((data:FormData)=>new Promise<{ok:boolean;revision:number}>(resolve=>{ expect(data.get("hook")).toBe("First text");complete=resolve; }));
 render(<StoryEditor candidate={{...candidate,id:"during-save"}} saveDraftAction={save} />);
 fireEvent.change(screen.getByLabelText("Hook"),{target:{value:"First text"}});
 fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
 await waitFor(()=>expect(save).toHaveBeenCalled());
 fireEvent.change(screen.getByLabelText("Hook"),{target:{value:"New text during request"}});
 complete({ok:true,revision:4});
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Unsaved"));
 expect(screen.getByLabelText("Hook")).toHaveValue("New text during request");
 expect(sessionStorage.getItem("larper-draft:test:founder-1:during-save")).toContain("New text during request");
});
