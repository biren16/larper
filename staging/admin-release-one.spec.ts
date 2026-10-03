import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/data/postgres/database.types";
import { readStagingConfig } from "./config";
const config=readStagingConfig(process.env);
const database=createClient<Database>(config.supabaseUrl,config.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
test("deployed incomplete saves, reload, conflict preservation and anonymous isolation",async ({page,browser})=>{
 // This creates isolated editorial records, not fictional public reporting.
 await page.goto("/studio/posts"); await page.getByRole("button",{name:"New story",exact:true}).click();
 await expect(page).toHaveURL(/\/studio\/candidates\/[a-f0-9-]+/);
 const id=page.url().split("/candidates/")[1].split("?")[0];
 try {
  await page.getByLabel("Hook",{exact:true}).fill("Isolated unfinished staging writing");
  await expect(page.getByRole("status")).toHaveText("Saved",{timeout:15000});
  const snapshot=await database.from("stories").select("id").eq("cluster_id",id); expect(snapshot.error).toBeNull(); expect(snapshot.data).toHaveLength(0);
  await page.reload(); await expect(page.getByLabel("Hook",{exact:true})).toHaveValue("Isolated unfinished staging writing");
  const candidate=await database.from("topic_clusters").select("editorial_version").eq("id",id).single(); expect(candidate.error).toBeNull();
  const working=await database.from("editorial_working_drafts").select("content,editor_id").eq("candidate_id",id).single(); expect(working.error).toBeNull();
  const mutation=await database.rpc("save_editorial_working_draft",{p_candidate_id:id,p_reviewer_id:working.data!.editor_id!,p_draft:working.data!.content,p_expected_version:candidate.data!.editorial_version});expect(mutation.error).toBeNull();
  await page.getByLabel("Hook",{exact:true}).fill("Retain stale tab writing");await expect(page.getByRole("status")).toHaveText("Conflict",{timeout:15000});
  await expect(page.getByLabel("Hook",{exact:true})).toHaveValue("Retain stale tab writing");
  await page.reload();await expect(page.getByRole("button",{name:"Recover writing"})).toBeVisible();await page.getByRole("button",{name:"Recover writing"}).click();await expect(page.getByLabel("Hook",{exact:true})).toHaveValue("Retain stale tab writing");
  const anonymous=await browser.newContext({storageState:{cookies:[],origins:[]}});const publicPage=await anonymous.newPage();await publicPage.goto(new URL(`/studio/candidates/${id}`,page.url()).href);await expect(publicPage).toHaveURL(/\/auth/);await anonymous.close();
 } finally {
  // Retain the isolated private record and history; no permanent deletion.
  const candidate=await database.from("topic_clusters").select("editorial_version").eq("id",id).single();
  const draft=await database.from("editorial_working_drafts").select("editor_id").eq("candidate_id",id).single();
  const retired=await database.rpc("transition_editorial_version",{p_candidate_id:id,p_reviewer_id:draft.data!.editor_id!,p_expected_version:candidate.data!.editorial_version,p_state:"rejected",p_action:"reject",p_notes:"Isolated release-one verification complete; retain private record and audit history"});
  expect(retired.error).toBeNull();
 }
});
