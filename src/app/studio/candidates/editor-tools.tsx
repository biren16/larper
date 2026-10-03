"use client";
import { flushSync } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { StudioCandidateDetail } from "./story-editor";

export function useCurrentForm() {
  const host = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const form = host.current?.closest('form');
    if (!form) return;
    const update = () => setValues(Object.fromEntries([...new FormData(form)].filter((entry): entry is [string,string] => typeof entry[1] === 'string')));
    update();
    for (const event of ['input','change','draftchange']) form.addEventListener(event, update);
    return () => { for (const event of ['input','change','draftchange']) form.removeEventListener(event, update); };
  }, []);
  return { host, values };
}

export function TagControls({ initial, onDraftChange }: { initial: string[]; onDraftChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState(initial);
  const [entry, setEntry] = useState('');
  const apply = (next: string[]) => {
    flushSync(() => setTags(next));
    if (input.current) { input.current.value = next.join(','); input.current.dispatchEvent(new Event('change',{bubbles:true})); onDraftChange(); }
  };
  useEffect(() => {
    const form = input.current?.form;
    const update = () => setTags(input.current?.value.split(',').filter(Boolean) ?? []);
    form?.addEventListener('draftchange',update);
    return () => form?.removeEventListener('draftchange',update);
  }, []);
  const add = () => { const tag=entry.trim().replaceAll(',', '').slice(0,80); if(tag && !tags.includes(tag)) apply([...tags,tag]); setEntry(''); };
  return <div><input ref={input} type="hidden" name="tags" value={tags.join(',')} readOnly /><label>Add tag<input value={entry} onChange={event => setEntry(event.target.value)} onKeyDown={event => { if(event.key === 'Enter'){event.preventDefault();add();} }} /></label><button type="button" onClick={add}>Add tag</button><ul aria-label="Tags">{tags.map(tag=><li key={tag}>{tag} <button type="button" aria-label={`Remove tag ${tag}`} onClick={()=>apply(tags.filter(value=>value!==tag))}>Remove</button></li>)}</ul></div>;
}

const fields: Array<[string,string]> = [['nicheId','Choose a niche'],['slug','Add a valid slug'],['title','Add a title'],['hook','Write a hook'],['summary','Explain what happened'],['whyItMatters','Explain why people care'],['lore','Write the lore'],['beginnerContext','Add beginner context'],['conversationLine','Add a conversation line'],['regions','Choose at least one region'],['freshnessLabel','Add a freshness label'],['evidenceSummary','Summarise the evidence'],['independentSourcesConfirmed','Confirm independent original sources']];
export function PublicationChecklist({candidate}: {candidate:StudioCandidateDetail}) {
 const {host,values}=useCurrentForm();
 const available=candidate.evidence.filter(item=>item.availability==='available');
 const allowlistedOrigins=new Set(available.filter(item=>item.allowlisted).map(item=>item.originKey ?? item.sourceDefinitionId ?? item.id)).size;
 const origins=new Set(available.map(item=>item.originKey ?? item.sourceDefinitionId ?? item.id)).size;
 return <div ref={host}><section aria-label="Publication checklist"><h2>Publication checklist</h2><p>These checks use your current writing. Founder approval and server evidence/rights checks still apply.</p><ul>{fields.map(([field,label])=>{const complete=Boolean(values[field]?.trim()) && (field!=='slug' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values[field]));return <li key={field}><span>{complete?'Ready':'Needed'} · </span><a href={`#field-${field}`}>{label}</a></li>;})}</ul>{origins<2 && <p>Blocker: at least two available independent original sources are required; {origins} currently linked.</p>}{candidate.sensitiveFlags.length>0 && <p>Mandatory founder review: {candidate.sensitiveFlags.join(', ')}.</p>}{!available.some(item=>["primary","publication"].includes(item.trustTier)) && <p>Story blocker: link at least one primary source or credible publication.</p>}<ul aria-label="Brief blockers">{candidate.heat<70 && <li>Brief: heat must be at least 70 (currently {candidate.heat}).</li>}{candidate.confidence<80 && <li>Brief: confidence must be at least 80 (currently {candidate.confidence}).</li>}{allowlistedOrigins<2 && <li>Brief: two available allowlisted origins are required (currently {allowlistedOrigins}).</li>}{candidate.sensitiveFlags.length>0 && <li>Brief: sensitive topics require a reviewed full story.</li>}</ul><p>An origin count cannot confirm independence; open the receipts.</p></section></div>;
}

export function CandidateSearch({ candidates, search }: { candidates: NonNullable<StudioCandidateDetail['mergeCandidates']>; search?: (query:string)=>Promise<NonNullable<StudioCandidateDetail['mergeCandidates']>> }) {
 const [query,setQuery]=useState('');
 const [results,setResults]=useState(candidates);
 const [error,setError]=useState('');
 useEffect(()=>{if(!search || !query.trim()) return;let active=true;const timer=setTimeout(()=>{void search(query).then(items=>{if(active){setResults(items);setError('');}}).catch(()=>{if(active)setError('Candidate search failed. Try again.');});},300);return()=>{active=false;clearTimeout(timer);};},[query,search]);
 return <div>{error && <p>{error}</p>}<p>Search all private candidates by title; up to 50 matches at a time.</p><label>Search candidates<input type="search" value={query} onChange={event=>setQuery(event.target.value)} /></label><label>Duplicate candidate<select name="sourceId" required defaultValue=""><option value="">Choose a candidate</option>{(query.trim() && search ? results : candidates).filter(item=>item.title.toLowerCase().includes(query.toLowerCase())).map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>;
}
