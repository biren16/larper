"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PublicStoryPresentation } from "@/components/discovery/public-story-presentation";
import type { TopicDetailViewModel } from "@/domain/discovery/services";
import type { SourceSignal } from "@/domain/discovery/types";
import type { StudioCandidateDetail } from "./story-editor";
import { useCurrentForm } from "./editor-tools";
import styles from "./story-preview.module.css";

export function StoryPreview({candidate}: {candidate:StudioCandidateDetail}) {
 const {host,values}=useCurrentForm();
 const [opened,setOpened]=useState(false);
 const [width,setWidth]=useState('desktop');
 const iframe=useRef<HTMLIFrameElement>(null);
 const [root,setRoot]=useState<HTMLElement | null>(null);
 useEffect(()=>{
   const doc=iframe.current?.contentDocument;
   if (!opened || !doc) return;
   const updateStyles=()=>{
     doc.head.querySelectorAll('[data-preview-style]').forEach(node=>node.remove());
     document.querySelectorAll('link[rel="stylesheet"],style').forEach(node=>{const clone=node.cloneNode(true) as HTMLElement;clone.dataset.previewStyle='true';doc.head.append(clone);});
     doc.documentElement.className=document.documentElement.className;
     doc.body.className=document.body.className;
   };
   updateStyles();
   const observer=new MutationObserver(updateStyles);observer.observe(document.head,{childList:true});
   setRoot(doc.body);
   return ()=>observer.disconnect();
 },[opened]);
 const niche=candidate.niches?.find(item=>item.id===values.nicheId);
 const media=candidate.mediaOptions?.find(item=>item.id===values.mediaId);
 const detail:TopicDetailViewModel={
   topic:{id:candidate.id,slug:values.slug??'',nicheId:values.nicheId??'',title:values.title??'',hook:values.hook??'',summary:values.summary??'',whyItMatters:values.whyItMatters??'',lore:values.lore??'',beginnerContext:values.beginnerContext??'',type:(values.discoveryType??'TREND') as TopicDetailViewModel['topic']['type'],mode:values.mode==='deep-lore'?'deep-lore':'current',publicationFormat:'story',lifecycle:'published_story',regions:(values.regions??'').split(',').filter(Boolean),firstDetectedAt:candidate.lastCheckedAt??'2026-01-01T00:00:00Z',lastUpdatedAt:candidate.lastCheckedAt??'2026-01-01T00:00:00Z',lastCheckedAt:candidate.lastCheckedAt??'2026-01-01T00:00:00Z',publishedAt:candidate.lastCheckedAt??'2026-01-01T00:00:00Z',freshnessLabel:values.freshnessLabel??'',confidence:candidate.confidence,evidenceSummary:values.evidenceSummary??'',signals:{freshness:0,momentum:0,novelty:0},tags:(values.tags??'').split(','),relatedTopicIds:[],status:'published',origin:'ingested'},
   niche:{id:values.nicheId??'',slug:values.nicheId??'',name:niche?.name??'Unassigned',description:'',curiosityHook:'',parentCategory:'',relatedNicheIds:[],status:'active',origin:'ingested'},
   media:media?.src?{id:media.id,src:media.src,alt:media.alt,width:media.width??1400,height:media.height??1400,creditLine:media.creditLine??undefined,modificationAllowed:media.modificationAllowed,kind:'uploaded'}:null,
   sources:candidate.evidence.map(item=>({id:item.id,topicId:candidate.id,sourceType:(item.sourceType??'manual') as SourceSignal['sourceType'],sourceName:item.sourceName,sourceDefinitionId:item.sourceDefinitionId??item.id,sourceUrl:item.sourceUrl,title:item.title,locale:'en',region:'global',publishedAt:'',observedAt:'',trustTier:item.trustTier as SourceSignal['trustTier'],availability:item.availability as SourceSignal['availability'],signalStrength:0,origin:'ingested'})),score:0,sourceCount:candidate.evidence.length,relatedTopics:[],
 };
 return <div ref={host} className={styles.preview}>
   <button type="button" className={styles.trigger} onClick={()=>setOpened(!opened)}>{opened?'Close preview':'Preview public story'}</button>
   {opened && <><p>Private preview · current writing and receipts. Related recommendations and account saves appear after approval.</p><div role="group" aria-label="Preview width"><button type="button" aria-pressed={width==='desktop'} onClick={()=>setWidth('desktop')}>Desktop</button><button type="button" aria-pressed={width==='mobile'} onClick={()=>setWidth('mobile')}>Mobile</button></div><div className={styles.viewport}><iframe ref={iframe} title="Public story preview" className={styles.frame} style={{width:width==='mobile'?390:1100}} srcDoc="<!doctype html><html><head></head><body></body></html>" onLoad={event=>{const doc=event.currentTarget.contentDocument;if(doc){document.querySelectorAll('link[rel=stylesheet],style').forEach(node=>doc.head.append(node.cloneNode(true)));doc.documentElement.className=document.documentElement.className;doc.body.className=document.body.className;setRoot(doc.body);}}} />{root && createPortal(<PublicStoryPresentation detail={detail} />,root)}</div></>}
 </div>;
}
