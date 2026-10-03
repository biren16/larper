"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {managePostsAction} from "../../../posts/management-actions";
export function RevisionRestore({candidateId,version,revision}:{candidateId:string;version:number;revision:number}) {
 const [message,setMessage]=useState("");const [pending,start]=useTransition();const router=useRouter();
 return <form action={form=>start(async()=>{try{const [result]=await managePostsAction(form);setMessage(result?.ok?"Restored privately. Fresh approval is required.":result?.error??"Restore failed");router.refresh();}catch(error){setMessage(error instanceof Error?error.message:"Restore failed");}})}>
 <input type="hidden" name="operation" value="restore_revision"/><input type="hidden" name="selection" value={`${candidateId}:${version}`}/><input type="hidden" name="revision" value={revision}/>
 <label><input type="checkbox" name="confirmed" required/> Confirm restoring revision {revision} to private writing</label><button disabled={pending}>Restore this revision privately</button><p role="status">{message}</p></form>;
}
