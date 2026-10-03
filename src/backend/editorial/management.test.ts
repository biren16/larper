import { describe, expect, it } from "vitest";
import { differenceFields, normalizePostQuery, runBulkManagement } from "./management";
const posts = [
 { id:"a", title:"Private title", nicheId:"books", status:"draft", lastEditedAt:"2026-10-01", editorialVersion:2 },
 { id:"b", title:"Live title", nicheId:"music", status:"published", lastEditedAt:"2026-10-02", editorialVersion:3 },
 { id:"c", title:"Trash title", nicheId:"books", status:"trash", lastEditedAt:"2026-10-03", editorialVersion:4 },
];
describe("post management",()=>{
 it("normalizes status, bounded integer page and real date filters",()=>{
  expect(normalizePostQuery({tab:"unknown",page:"1.5",from:"2026-99-99",to:"2026-02-30"})).toMatchObject({tab:"all",page:1,from:"",to:""});
  expect(normalizePostQuery({tab:"trash",page:"2",from:"2026-10-01"})).toMatchObject({tab:"trash",page:2,from:"2026-10-01"});
 });
 it("returns each bulk conflict without rolling back independent successes",async()=>{
  const result=await runBulkManagement(posts.slice(0,2),async row=>{if(row.id==="b") throw new Error("EDITORIAL_CONFLICT: Reload"); return {revision:5};});
  expect(result).toEqual([{id:"a",ok:true,revision:5},{id:"b",ok:false,conflict:true,error:"EDITORIAL_CONFLICT: Reload"}]);
 });
 it("compares revision field values rather than metadata timestamps",()=>{
  expect(differenceFields({title:"Old",tags:["x"]},{title:"New",tags:["x"]})).toEqual([{field:"title",before:"Old",after:"New"}]);
 });
});
