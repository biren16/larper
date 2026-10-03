"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ManagedPost } from "@/backend/editorial/management";
import { managePostsAction } from "./management-actions";
import styles from "../studio.module.css";
export function PostsManager({posts,niches,returnTo}:{posts:ManagedPost[];niches:{id:string;name:string}[];returnTo:string}) {
 useEffect(()=>{const key=`studio-position:${returnTo}`;const position=sessionStorage.getItem(key);if(position)window.scrollTo(0,Number(position));const save=()=>sessionStorage.setItem(key,String(window.scrollY));window.addEventListener("scroll",save);return()=>window.removeEventListener("scroll",save);},[returnTo]);
 const [results,setResults]=useState<Awaited<ReturnType<typeof managePostsAction>>>([]);const [pending,start]=useTransition();const router=useRouter();
 return <form className={styles.queue} action={form=>start(async()=>{try{setResults(await managePostsAction(form));router.refresh();}catch(error){setResults([{id:"Selection",ok:false,conflict:false,error:error instanceof Error?error.message:"Operation failed"}]);}})}>
 <fieldset disabled={pending}><legend>Select posts to manage</legend>
 {posts.map(post=><article className={styles.candidate} key={post.id}>
 <label><input type="checkbox" name="selection" value={`${post.id}:${post.editorialVersion}`}/> Select {post.title}</label>
 <div><Link href={`/studio/candidates/${post.id}?returnTo=${encodeURIComponent(returnTo)}`}>{post.title}</Link><p>{niches.find(n=>n.id===post.nicheId)?.name??"Unassigned"} · {post.status} · {post.mediaId?"Cover selected":"Generated cover"}{post.privateEdits?" · Private edits":""}</p><p>Last edit {post.lastEditedAt}{post.scheduledFor?` · Scheduled ${post.scheduledFor}`:""}</p>{post.needsReview&&<p className={styles.warning}>Needs review: {post.needsReview}</p>}</div>
 </article>)}
 {!posts.length&&<p>No posts match these filters.</p>}
 <label>Operation <select name="operation"><option value="trash">Move to Trash</option><option value="restore">Restore privately</option><option value="unpublish">Unpublish</option><option value="duplicate">Duplicate privately</option><option value="change_niche">Change private niche</option><option value="cancel_schedule">Cancel schedule</option></select></label>
 <label>Niche for change <select name="nicheId"><option value="">Choose niche</option>{niches.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
 <label><input type="checkbox" name="confirmed" required/> Confirm the selected operation for every selected post</label><button type="submit">{pending?"Applying…":"Apply to selection"}</button>
 </fieldset><div role="status">{results.map(r=><p key={r.id}>{posts.find(p=>p.id===r.id)?.title??r.id}: {r.ok?<>Saved revision {r.revision}{r.candidateId!==r.id&&<Link href={`/studio/candidates/${r.candidateId}`}> Open copy</Link>}</>:`${r.conflict?"Conflict — ":""}${r.error}`}</p>)}</div></form>;
}
