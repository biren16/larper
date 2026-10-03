import Link from "next/link";
import { notFound } from "next/navigation";
import { authorizedStudioRuntime } from "../../../runtime";
import { differenceFields } from "@/backend/editorial/management";
import { RevisionRestore } from "./revision-restore";
import styles from "../../../studio.module.css";
export default async function HistoryPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{revision?:string;returnTo?:string}>}) {
 const [{id},query]=await Promise.all([params,searchParams]);
 if(!/^[0-9a-f-]{36}$/i.test(id)) notFound();
 const returnTo=query.returnTo?.startsWith("/studio/posts?") && !query.returnTo.includes("\\") ? query.returnTo : "/studio/posts";
 const runtime=await authorizedStudioRuntime(`/studio/candidates/${id}/history`);
 const candidate=await runtime.reader.candidate(id);if(!candidate)notFound();
 const [history,activity]=await Promise.all([
  runtime.client.from("editorial_working_revisions").select("*").eq("candidate_id",id).order("revision",{ascending:false}),
  runtime.client.from("review_events").select("*").eq("cluster_id",id).order("created_at",{ascending:false}),
 ]);
 if(history.error||activity.error)throw new Error(history.error?.message??activity.error?.message);
 const selected=history.data?.find(r=>r.revision===Number(query.revision))??history.data?.[0];
 const previous=history.data?.find(r=>r.revision===(selected?.revision??0)-1);
 const differences=selected?differenceFields((previous?.content??{}) as Record<string,unknown>,selected.content as Record<string,unknown>):[];
 return <main id="main-content" className={styles.main}><h1>{candidate.title}: Activity and revisions</h1><Link href={`/studio/candidates/${id}?returnTo=${encodeURIComponent(returnTo)}`}>Back to editor</Link>
 <section><h2>Private working revisions</h2><p>Each save is grouped as one revision. Restoring a revision changes only private writing and clears approval confirmation.</p>
 {history.data?.map(r=><p key={r.revision}><Link href={`?revision=${r.revision}&returnTo=${encodeURIComponent(returnTo)}`}>Revision {r.revision}</Link> · {r.created_at} · Editor {r.editor_id??"System"}</p>)}
 {selected&&<><h3>Revision {selected.revision} changes from {previous?.revision??"empty"}</h3><dl>{differences.map(d=><div key={d.field}><dt>{d.field}</dt><dd>Before: {JSON.stringify(d.before)??"Unset"}</dd><dd>After: {JSON.stringify(d.after)??"Unset"}</dd></div>)}</dl>{!candidate.trashedAt&&<RevisionRestore candidateId={id} version={candidate.editorialVersion??0} revision={selected.revision}/>}</>}
 </section><section><h2>Explicit actions</h2>{activity.data?.map(event=><p key={event.id}>{event.created_at} · {event.action.replaceAll("_"," ")} · Actor {event.reviewer_id} · {event.notes}</p>)}</section></main>;
}
