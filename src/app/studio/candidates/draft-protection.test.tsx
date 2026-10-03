import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDraftProtection } from "./use-draft-protection";
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
function CancelHarness({ cancel }: {cancel?: (data: FormData)=>Promise<{ok:boolean;revision:number;workingPersisted?:boolean}>} = {}) {
 const protection=useDraftProtection("larper-draft:test:founder-1:cancel-after-failure",3,async()=>({ok:false,error:"Offline"}));
 return <form ref={element=>protection.attachForm(element)} onChange={()=>protection.changed()}><label>Hook<input name="hook" /></label><p role="status">{protection.status}</p><button type="button" onClick={()=>void protection.save()}>Save</button><button type="button" onClick={()=>void protection.save(cancel ?? (async()=>({ok:true,revision:4})))}>Cancel schedule</button></form>;
}
it("keeps dirty recovery after a successful action that did not persist writing", async () => {
 render(<CancelHarness />);
 fireEvent.change(screen.getByLabelText("Hook"),{target:{value:"Writing after failed save"}});
 fireEvent.click(screen.getByRole("button",{name:"Save"}));
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Save failed"));
 fireEvent.click(screen.getByRole("button",{name:"Cancel schedule"}));
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Unsaved"));
 expect(sessionStorage.getItem("larper-draft:test:founder-1:cancel-after-failure")).toContain("Writing after failed save");
});

it.each([false,true])("persists dirty cancellation writing after prior failure %s", async (priorFailure) => {
 let persisted="";
 const cancel=vi.fn(async(data: FormData)=>{persisted=String(data.get("hook"));return {ok:true,revision:4,workingPersisted:true};});
 render(<CancelHarness cancel={cancel} />);
 fireEvent.change(screen.getByLabelText("Hook"),{target:{value:"Latest unsaved cancellation writing"}});
 if(priorFailure) {
  fireEvent.click(screen.getByRole("button",{name:"Save"}));
  await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Save failed"));
 }
 fireEvent.click(screen.getByRole("button",{name:"Cancel schedule"}));
 await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Saved"));
 expect(persisted).toBe("Latest unsaved cancellation writing");
 expect(sessionStorage.getItem("larper-draft:test:founder-1:cancel-after-failure")).toBeNull();
});
it('attaches an uploaded cover and autosaves current writing with the same editorial version',async()=>{
 const save=vi.fn(async(data:FormData)=>{expect(data.get('hook')).toBe('Writing beside upload');expect(data.get('mediaId')).toBe('new-cover');expect(data.get('editorialVersion')).toBe('3');return {ok:true,revision:4,workingPersisted:true};});
 render(<StoryEditor candidate={{...candidate,id:'upload-attach'}} saveDraftAction={save} uploadMediaAction={async()=>({ok:true,mediaId:'new-cover'})} />);
 fireEvent.change(screen.getByLabelText('Hook'),{target:{value:'Writing beside upload'}});
 fireEvent.submit(screen.getByRole('form',{name:'Upload approved image'}));
 await waitFor(()=>expect(screen.getByRole('combobox',{name:'Story image'})).toHaveValue('new-cover'));
 expect(screen.getByLabelText('Hook')).toHaveValue('Writing beside upload');
 await waitFor(()=>expect(save).toHaveBeenCalled(),{timeout:2000});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Saved'));
});

it('autosaves tag-only commits and removals and reloads their persisted state',async()=>{
 const {storyDraftFromForm}=await import('@/backend/editorial/actions');
 let persisted=storyDraftFromForm(new FormData(),true);
 const save=vi.fn(async(data:FormData)=>{persisted=storyDraftFromForm(data,true);return {ok:true,revision:4,workingPersisted:true};});
 const props={...candidate,id:'tag-only',draft:persisted};
 let view=render(<StoryEditor candidate={props} saveDraftAction={save} />);
 fireEvent.change(screen.getByRole('textbox',{name:'Add tag'}),{target:{value:'archive'}});
 await waitFor(()=>expect(save).toHaveBeenCalled(),{timeout:2000});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Saved'));
 expect(persisted.tags).toEqual([]);
 // Commit after tag-entry typing itself has already saved. Only the hidden tag changes now.
 fireEvent.click(screen.getByRole('button',{name:'Add tag'}));
 expect(screen.getByRole('status')).toHaveTextContent('Unsaved');
 expect(sessionStorage.getItem('larper-draft:test:founder-1:tag-only')).toContain('archive');
 await waitFor(()=>expect(persisted.tags).toEqual(['archive']),{timeout:2000});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Saved'));
 view.unmount();
 view=render(<StoryEditor candidate={{...props,draft:persisted}} saveDraftAction={save} />);
 expect(screen.getByRole('button',{name:'Remove tag archive'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Remove tag archive'}));
 expect(screen.getByRole('status')).toHaveTextContent('Unsaved');
 await waitFor(()=>expect(persisted.tags).toEqual([]),{timeout:2000});
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Saved'));
 view.unmount();
 render(<StoryEditor candidate={{...props,draft:persisted}} saveDraftAction={save} />);
 expect(screen.queryByRole('button',{name:'Remove tag archive'})).not.toBeInTheDocument();
});

it('recovers Music to Style with both newly mounted subtopics and writing intact',async()=>{
 const {storyDraftFromForm}=await import('@/backend/editorial/actions');
 sessionStorage.setItem('larper-draft:test:founder-1:recover-style',JSON.stringify({nicheId:['style'],tags:['archive'],styleSubtopicsPresent:['true'],styleSubtopics:['sneakers','streetwear'],hook:['Recovered writing']}));
 let persisted=storyDraftFromForm(new FormData(),true);
 const save=vi.fn(async(data:FormData)=>{persisted=storyDraftFromForm(data,true);return {ok:true,revision:4,workingPersisted:true};});
 render(<StoryEditor candidate={{...candidate,id:'recover-style',nicheId:'music',niches:[{id:'music',name:'Music'},{id:'style',name:'Style'}]}} saveDraftAction={save} />);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Recover writing'})).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'Recover writing'}));
 expect(screen.getByRole('combobox',{name:'Niche'})).toHaveValue('style');
 expect(screen.getByRole('checkbox',{name:'Sneakers'})).toBeChecked();
 expect(screen.getByRole('checkbox',{name:'Streetwear'})).toBeChecked();
 expect(screen.getByLabelText('Hook')).toHaveValue('Recovered writing');
 await waitFor(()=>expect(save).toHaveBeenCalled(),{timeout:2000});
 expect(persisted).toMatchObject({nicheId:'style',tags:['archive','sneakers','streetwear'],hook:'Recovered writing'});
});
it('recovers cleared Style checkbox groups after failed save and refresh',async()=>{
 const props={...candidate,id:'cleared-style',nicheId:'style',niches:[{id:'style',name:'Style'}],draft:{nicheId:'style',tags:['sneakers','streetwear'],regions:['global']}};
 const fail=async()=>({ok:false,error:'Offline'});
 const view=render(<StoryEditor candidate={props as never} saveDraftAction={fail}/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Sneakers'}));
 fireEvent.click(screen.getByRole('checkbox',{name:'Streetwear'}));
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Save failed'));
 view.unmount();
 render(<StoryEditor candidate={props as never} saveDraftAction={fail}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Recover writing'})).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'Recover writing'}));
 expect(screen.getByRole('checkbox',{name:'Sneakers'})).not.toBeChecked();
 expect(screen.getByRole('checkbox',{name:'Streetwear'})).not.toBeChecked();
});
it('retains a searched older cover through save reload preview and text autosave',async()=>{
 const {storyDraftFromForm}=await import('@/backend/editorial/actions');
 const older={id:'older-cover',alt:'Older approved cover',creditLine:null,src:'/older.jpg',width:1200,height:800};
 let persisted=storyDraftFromForm(new FormData(),true);
 const save=async(data:FormData)=>{persisted=storyDraftFromForm(data,true);return {ok:true,revision:4,workingPersisted:true};};
 const props={...candidate,id:'older-cover-story',mediaOptions:[]};
 const view=render(<StoryEditor candidate={props} saveDraftAction={save} searchMediaAction={async()=>[older]}/>);
 fireEvent.change(screen.getByRole('searchbox',{name:'Search media'}),{target:{value:'Older'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Select Older approved cover'})).toBeInTheDocument());
 fireEvent.click(screen.getByRole('button',{name:'Select Older approved cover'}));
 fireEvent.change(screen.getByLabelText('Hook'),{target:{value:'First writing'}});
 fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Saved'));
 expect(persisted.mediaId).toBe('older-cover');
 view.unmount();
 render(<StoryEditor candidate={{...props,draft:persisted,mediaId:persisted.mediaId,mediaOptions:[older]}} saveDraftAction={save}/>);
 expect(screen.getByRole('combobox',{name:'Story image'})).toHaveValue('older-cover');
 fireEvent.click(screen.getByRole('button',{name:'Preview public story'}));
 const frame=screen.getByTitle('Public story preview') as HTMLIFrameElement;
 await waitFor(()=>expect(frame.contentDocument?.querySelector('img[alt="Older approved cover"]')).not.toBeNull());
 fireEvent.change(screen.getByLabelText('Hook'),{target:{value:'Text after reload'}});
 await waitFor(()=>expect(persisted.hook).toBe('Text after reload'),{timeout:2000});
 expect(persisted.mediaId).toBe('older-cover');
});
