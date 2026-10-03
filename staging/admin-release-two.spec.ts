import {test,expect} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "../src/data/postgres/database.types";
import {readStagingConfig} from "./config";
const config=readStagingConfig(process.env);
const database=createClient<Database>(config.supabaseUrl,config.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
test("deployed mobile post filters, return scroll, keyboard bulk confirmation and private history restore",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const ids:string[]=[];let actor="";
 const title=`Isolated management ${Date.now()}`;
 try {
  await page.goto("/studio/posts");await page.getByRole("button",{name:"New story",exact:true}).click();
  const id=page.url().split("/candidates/")[1].split("?")[0];ids.push(id);
  await page.getByLabel("Title",{exact:true}).fill(title);
  await expect(page.getByRole("status")).toHaveText("Saved",{timeout:15000});
  const working=await database.from("editorial_working_drafts").select("editor_id").eq("candidate_id",id).single();expect(working.error).toBeNull();actor=working.data!.editor_id!;
  for(let index=0;index<21;index++) {
   const c=await database.rpc("create_editorial_working_story",{p_reviewer_id:actor});expect(c.error).toBeNull();ids.push(c.data!);
   const v=await database.from("topic_clusters").select("editorial_version").eq("id",c.data!).single();
   const saved=await database.rpc("save_editorial_working_draft",{p_candidate_id:c.data!,p_reviewer_id:actor,p_expected_version:v.data!.editorial_version,p_draft:{title:`${title} ${index}`,nicheId:"books",slug:"",independentSourcesConfirmed:false}});expect(saved.error).toBeNull();
  }
  await page.goto(`/studio/posts?tab=draft&search=${encodeURIComponent(title)}&page=1`);
  await expect(page.getByRole("link",{name:"Next",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const row=page.getByRole("link",{name:`${title} 8`,exact:true});await row.scrollIntoViewIfNeeded();
  const position=await page.evaluate(()=>window.scrollY);expect(position).toBeGreaterThan(0);
  await row.click();await page.getByRole("link",{name:"Back to Posts",exact:true}).click();
  await expect(page).toHaveURL(/tab=draft.*page=1/);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(position-100);
  const checkboxes=page.getByRole("checkbox",{name:/^Select /});
  await checkboxes.nth(0).focus();await page.keyboard.press("Space");await checkboxes.nth(1).focus();await page.keyboard.press("Space");
  await page.getByRole("button",{name:"Apply to selection"}).click();
  await expect(page.getByRole("checkbox",{name:/Confirm the selected operation/})).not.toBeChecked();
  await page.getByRole("checkbox",{name:/Confirm the selected operation/}).focus();await page.keyboard.press("Space");
  await page.getByRole("button",{name:"Apply to selection"}).click();await expect(page.getByRole("status")).toContainText("Saved revision");
  await page.goto(`/studio/candidates/${id}/history`);
  await page.getByRole("link",{name:"Revision 1",exact:true}).click();
  await page.getByRole("checkbox",{name:/Confirm restoring revision 1/}).check();
  await page.getByRole("button",{name:"Restore this revision privately"}).click();
  await expect(page.getByRole("status")).toHaveText("Restored privately. Fresh approval is required.");
  const restored=await database.from("editorial_working_drafts").select("content").eq("candidate_id",id).single();
  expect(restored.data!.content).toMatchObject({title:"Untitled story",independentSourcesConfirmed:false});
  const snapshot=await database.from("stories").select("id").eq("cluster_id",id);expect(snapshot.data).toEqual([]);
 } finally {
  for(const id of ids) {
   const c=await database.from("topic_clusters").select("editorial_version,trashed_at").eq("id",id).single();
   if(c.data&&!c.data.trashed_at&&actor) {const result=await database.rpc("manage_editorial_post",{p_candidate_id:id,p_reviewer_id:actor,p_expected_version:c.data.editorial_version,p_operation:"trash",p_payload:{reason:"Isolated release-two verification complete"}});expect(result.error).toBeNull();}
  }
 }
});
