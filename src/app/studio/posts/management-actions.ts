"use server";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { runBulkManagement } from "@/backend/editorial/management";
import { invalidatePublicDiscovery } from "@/backend/editorial/cache-invalidation";
import type { Json } from "@/data/postgres/database.types";
import { revalidatePath } from "next/cache";

export async function managePostsAction(form:FormData) {
 const runtime=await getEditorialRuntime();
 const operation=String(form.get("operation")??"");
 if(!["trash","restore","unpublish","duplicate","change_niche","cancel_schedule","restore_revision"].includes(operation)) throw new Error("Invalid operation");
 if(form.get("confirmed")!=="on") throw new Error("Confirm the selected operation");
 const selections=form.getAll("selection").map(value=>{const [id,version]=String(value).split(":");return {id,version:Number(version)};});
 if(!selections.length||selections.length>100||selections.some(row=>!Number.isSafeInteger(row.version)||row.version<0||!/^[0-9a-f-]{36}$/i.test(row.id))) throw new Error("Choose up to 100 valid posts");
 const payload:Json={nicheId:String(form.get("nicheId")??""),revision:Number(form.get("revision")??0)};
 const results=await runBulkManagement(selections,async row=>{
  const before=await runtime.client.from("stories").select("slug").eq("cluster_id",row.id).maybeSingle();
  if(before.error) throw new Error(before.error.message);
  const result=await runtime.client.rpc("manage_editorial_post",{p_candidate_id:row.id,p_reviewer_id:runtime.actor.id,p_expected_version:row.version,p_operation:operation,p_payload:payload});
  if(result.error) throw new Error(result.error.message);
  const saved=result.data?.[0];if(!saved) throw new Error("No management result returned");
  await invalidatePublicDiscovery({slug:before.data?.slug});
  return {revision:saved.revision,candidateId:saved.candidate_id};
 });
 revalidatePath("/studio");
 return results;
}
