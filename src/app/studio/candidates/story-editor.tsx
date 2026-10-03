"use client";

import { useDraftProtection, type EditorAction } from "./use-draft-protection";
import { useState } from "react";
import Link from "next/link";
import type { StoryDraft } from "@/backend/editorial/types";
import { StatusNotice } from "../status-notice";
import { PendingButton } from "../pending-button";
import styles from "./story-editor.module.css";
import { MediaLibrary, type LibraryAsset } from "../media/media-library";
import { CandidateSearch, PublicationChecklist, TagControls } from "./editor-tools";
import { StoryPreview } from "./story-preview";

export interface StudioCandidateDetail {
  id: string;
  editorialVersion?: number;
  accountId?: string;
  environment?: string;
  title: string;
  nicheId: string | null;
  lastCheckedAt?: string;
  heat: number;
  confidence: number;
  sensitiveFlags: string[];
  evidence: Array<{ id: string; title: string; sourceName: string; sourceUrl: string; trustTier: string; availability: string; originKey?: string; sourceDefinitionId?: string; sourceType?: string; allowlisted?: boolean }>;
  trashedAt?: string | null;
  everPublished?: boolean;
  needsReviewReason?: string | null;
  returnTo?: string;
  revisions?: Array<{ revision: number; createdAt: string; editorId: string }>;
  mediaId?: string | null;
  draft?: StoryDraft;
  storyLifecycle?: string;
  scheduledFor?: string | null;
  niches?: Array<{id: string; name: string}>;
  mergeCandidates?: Array<{id: string; title: string}>;
  mediaOptions?: Array<{ id: string; alt: string; creditLine: string | null; src?: string; width?: number; height?: number; modificationAllowed?: boolean; sourceUrl?: string; licenseCode?: string }>;
}

type Action = EditorAction;

function MoreActions({ candidate, transitionAction, mergeAction, splitAction, searchCandidatesAction, run }: { searchCandidatesAction?: (query:string,excludeId:string)=>Promise<Array<{id:string;title:string}>>; run: (action: Action, data: FormData) => Promise<void>; candidate: StudioCandidateDetail; transitionAction?: Action; mergeAction?: Action; splitAction?: Action }) {
  const published = ["published_story", "published_brief"].includes(candidate.storyLifecycle ?? "");
  if (!transitionAction && (!mergeAction || published) && (!splitAction || published)) return null;
  return (
    <details className={styles.moreActions} role="group" aria-label="More actions">
      <summary>More actions</summary>
      <p>These actions change the cluster or remove it from the editorial flow.</p>
      {mergeAction && !published && <form onSubmit={event => { event.preventDefault(); const data=new FormData(event.currentTarget); const button=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; if (button?.name) data.set(button.name,button.value); void run(mergeAction,data); }}><input type="hidden" name="targetId" value={candidate.id} /><CandidateSearch candidates={candidate.mergeCandidates ?? []} search={searchCandidatesAction ? query=>searchCandidatesAction(query,candidate.id) : undefined} /><PendingButton type="submit" pendingLabel="Merging…">Merge into this cluster</PendingButton></form>}
      {splitAction && !published && <form onSubmit={event => { event.preventDefault(); const data=new FormData(event.currentTarget); const button=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; if (button?.name) data.set(button.name,button.value); void run(splitAction,data); }}><input type="hidden" name="clusterId" value={candidate.id} /><fieldset><legend>Evidence to move</legend>{candidate.evidence.map(item=><label key={item.id}><input type="checkbox" name="signalIds" value={item.id} />{item.title} · {item.sourceName}</label>)}</fieldset><PendingButton type="submit" pendingLabel="Splitting…">Split evidence</PendingButton></form>}
      {transitionAction && <form onSubmit={event => { event.preventDefault(); const data=new FormData(event.currentTarget); const button=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; if (button?.name) data.set(button.name,button.value); void run(transitionAction,data); }}><input type="hidden" name="candidateId" value={candidate.id} /><input type="hidden" name="editorialVersion" value={candidate.editorialVersion ?? 0} /><label>Review note<textarea name="notes" required rows={3} /></label><div className={styles.secondaryActions}><PendingButton type="submit" name="action" value="reject" intentField="action" intentValue="reject" pendingLabel="Rejecting…">Reject</PendingButton><PendingButton type="submit" name="action" value="expire" intentField="action" intentValue="expire" pendingLabel="Expiring…">Expire</PendingButton><PendingButton type="submit" name="action" value="unpublish" intentField="action" intentValue="unpublish" pendingLabel="Unpublishing…">Unpublish</PendingButton></div></form>}
    </details>
  );
}

export function StoryEditor({
  candidate,
  publishAction,
  saveDraftAction,
  notice,
  error,
  transitionAction,
  mergeAction,
  splitAction,
  scheduleAction,
  uploadMediaAction,
  searchCandidatesAction,
  searchMediaAction,
}: {
  candidate: StudioCandidateDetail;
  publishAction?: Action;
  saveDraftAction?: Action;
  notice?: string;
  error?: string;
  transitionAction?: Action;
  mergeAction?: Action;
  splitAction?: Action;
  scheduleAction?: Action;
  uploadMediaAction?: Action;
  searchCandidatesAction?: (query:string,excludeId:string)=>Promise<Array<{id:string;title:string}>>;
  searchMediaAction?: (query:string)=>Promise<LibraryAsset[]>;
}) {
  const draft = candidate.draft;
  const [selectedNiche,setSelectedNiche]=useState(draft?.nicheId ?? candidate.nicheId ?? "");
  const protection = useDraftProtection(`larper-draft:${candidate.environment ?? "local"}:${candidate.accountId ?? "unknown"}:${candidate.id}`, candidate.editorialVersion ?? 0, saveDraftAction, values => setSelectedNiche(values.nicheId?.[0] ?? selectedNiche));
  const [selectedMedia,setSelectedMedia]=useState<LibraryAsset[]>([]);
  const mediaOptions=Array.from(new Map([...candidate.mediaOptions ?? [],...protection.uploadedMedia,...selectedMedia.map(asset=>({...asset,creditLine:asset.creditLine ?? null}))].map(asset=>[asset.id,asset])).values());
  const published = ["published_story", "published_brief"].includes(candidate.storyLifecycle ?? "");
  return (
    <main id="main-content" className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Studio breadcrumb"><Link href="/studio">Studio</Link><span>/</span><span>Candidate</span></nav>
      <header className={styles.header}>
        <div><p>{candidate.nicheId ?? "Unassigned"}</p><h1>{candidate.title}</h1></div>
        <dl>
          <div><dt>Heat</dt><dd>{candidate.heat}</dd></div>
          <div><dt>Confidence</dt><dd>{candidate.confidence}</dd></div>
          <div><dt>Linked signals</dt><dd>{candidate.evidence.length} signals</dd></div>
          <div><dt>Available origins</dt><dd>{new Set(candidate.evidence.filter(item=>item.availability === "available").map(item=>item.originKey ?? item.sourceDefinitionId ?? item.id)).size}</dd></div>
          <div><dt>Review</dt><dd>{candidate.sensitiveFlags.length > 0 ? "Mandatory" : "Standard"}</dd></div>
        </dl>
      </header>

      {candidate.sensitiveFlags.length > 0 && <div className={styles.alert} role="alert"><strong>Mandatory review</strong><span>{candidate.sensitiveFlags.join(", ")}</span></div>}
      <p><Link href={candidate.returnTo ?? "/studio/posts"}>Back to Posts</Link> · <Link href={`/studio/candidates/${candidate.id}/history?returnTo=${encodeURIComponent(candidate.returnTo ?? "/studio/posts")}`}>Activity and revision differences</Link></p>
      {candidate.needsReviewReason && <p role="status">Needs review: {candidate.needsReviewReason}</p>}
      {published && draft?.slug && <p><Link href={`/discover/${draft.slug}`}>View public story</Link> · Writing edits are private until you update the live post.</p>}
      <StatusNotice notice={notice} />
      <p role="status" aria-live="polite">{protection.status}</p>
      {protection.failure && <p role="alert">{protection.failure}{protection.status === "Conflict" && " · Your writing is retained. Open the latest version in another tab and compare before retrying."}</p>}
      {protection.feedback && <div aria-label="Field feedback"><ul>{Object.entries(protection.feedback.fieldErrors ?? {}).map(([field,message])=><li key={field}><a href={`#field-${field}`}>{message}</a></li>)}</ul>{protection.feedback.diagnostic && <details><summary>Action diagnostics</summary><p>{protection.feedback.diagnostic}</p></details>}</div>}
      {protection.recovery && <aside aria-label="Recover unsaved writing"><p>Unsaved writing from your last session is available.</p><button type="button" onClick={protection.restore}>Recover writing</button><button type="button" onClick={protection.discard}>Discard recovery</button></aside>}
      <nav aria-label="Editor sections"><a href="#write">Write</a> · <a href="#evidence-heading">Evidence &amp; cover</a> · <a href="#publish">Preview &amp; publish</a></nav>
      {error && <div className={styles.alert} role="alert"><strong>Could not complete that action</strong><span>{error}</span></div>}

      <div className={styles.workspace}>
        <form className={styles.editor} ref={element => protection.attachForm(element)} onChange={event => {
            const target=event.target as unknown as HTMLInputElement;
            const form=event.currentTarget;
            const slug=form.elements.namedItem("slug") as HTMLInputElement;
            if (!published && !candidate.everPublished && target.name === "slug") slug.dataset.manual="true";
            if (!published && !candidate.everPublished && target.name === "title" && !draft?.slug && slug.dataset.manual !== "true") slug.value=target.value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
            if(target.name === "nicheId") setSelectedNiche(target.value);
            protection.changed();
          }} onSubmit={event => {
            event.preventDefault();
            const button = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            const data = new FormData(event.currentTarget);
            if (button?.name) data.set(button.name, button.value);
            const selected = button?.value === "draft" ? saveDraftAction : ["schedule", "update_schedule", "cancel_schedule"].includes(button?.value ?? "") ? scheduleAction : publishAction;
            void protection.save(selected, data);
          }} aria-label="Story editor">
          <input type="hidden" name="candidateId" value={candidate.id} />

          <fieldset>
            <legend id="write">Story</legend>
            <label>Title<input id="field-title" name="title" required maxLength={140} defaultValue={draft?.title ?? candidate.title} /></label>
            <label>Hook<textarea id="field-hook" name="hook" defaultValue={draft?.hook ?? ""} required rows={3} /></label>
            <label>What happened?<textarea id="field-summary" name="summary" defaultValue={draft?.summary ?? ""} required rows={5} /></label>
          </fieldset>

          <fieldset>
            <legend>Context</legend>
            <label>Why people care<textarea id="field-whyItMatters" name="whyItMatters" defaultValue={draft?.whyItMatters ?? ""} required rows={5} /></label>
            <label>The lore<textarea id="field-lore" name="lore" defaultValue={draft?.lore ?? ""} required rows={7} /></label>
            <label>If you’re new<textarea id="field-beginnerContext" name="beginnerContext" defaultValue={draft?.beginnerContext ?? ""} required rows={4} /></label>
            <label>Say this in the group chat<textarea id="field-conversationLine" name="conversationLine" defaultValue={draft?.conversationLine ?? ""} required rows={3} placeholder="The useful line a reader can repeat without faking expertise." /></label>
          </fieldset>

          <fieldset>
            <legend>Classification</legend>
            <div className={styles.twoCol}>
              <label>Niche<select id="field-nicheId" name="nicheId" required defaultValue={draft?.nicheId ?? candidate.nicheId ?? ""}><option value="">Choose a niche</option>{(candidate.niches ?? []).map(niche=><option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label>
              <label>Slug<input readOnly={published || candidate.everPublished} id="field-slug" name="slug" defaultValue={draft?.slug ?? ""} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
            </div>
            <div className={styles.twoCol}>
              <label>Discovery type<select name="discoveryType" defaultValue={draft?.discoveryType ?? "TREND"}><option>TREND</option><option>MEME</option><option>DROP</option><option>LORE</option><option>DEBATE</option><option>COMEBACK</option><option>PRODUCT</option><option>EVENT</option><option>PERSON</option><option>AESTHETIC</option><option>DRAMA</option><option>RABBIT_HOLE</option></select></label>
              <label>Mode<select name="mode" defaultValue={draft?.mode ?? "current"}><option value="current">Current</option><option value="deep-lore">Deep Lore</option></select></label>
            </div>
            <div className={styles.twoCol}><label>Regions<input id="field-regions" name="regions" required defaultValue={draft?.regions.join(",") ?? "india,global"} /></label><label>Freshness label<input id="field-freshnessLabel" name="freshnessLabel" defaultValue={draft?.freshnessLabel ?? ""} required /></label></div>
            {selectedNiche === "style" && <fieldset>
              <legend>Style subtopics</legend>
              <input type="hidden" name="styleSubtopicsPresent" value="true" />
              <label className={styles.independenceCheck}><input type="checkbox" name="styleSubtopics" value="sneakers" defaultChecked={draft?.tags.some((tag) => tag.toLowerCase() === "sneakers")} />Sneakers</label>
              <label className={styles.independenceCheck}><input type="checkbox" name="styleSubtopics" value="streetwear" defaultChecked={draft?.tags.some((tag) => tag.toLowerCase() === "streetwear")} />Streetwear</label>
            </fieldset>}
            <TagControls onDraftChange={protection.changed} initial={draft?.tags.filter(tag=>draft.nicheId!=="style" || !["sneakers","streetwear"].includes(tag.toLowerCase())) ?? []} />
          </fieldset>

          <fieldset>
            <legend>Cover</legend>
            <label>Story image<select name="mediaId" defaultValue={candidate.mediaId ?? ""}>
              <option value="">Use a LARPer cover</option>
              {mediaOptions.map((asset) => <option key={asset.id} value={asset.id}>{asset.alt}{asset.creditLine ? ` · ${asset.creditLine}` : ""}</option>)}
            </select></label>
            <MediaLibrary assets={mediaOptions} selectable search={searchMediaAction} onSelect={asset=>setSelectedMedia(previous=>[asset,...previous.filter(item=>item.id!==asset.id)])} />
            <p className={styles.mediaHint}>Only uploaded images with recorded commercial-use permission appear here. LARPer covers work without an upload.</p>
          </fieldset>

          <fieldset>
            <legend>Evidence summary</legend>
            <label>What the sources establish<textarea id="field-evidenceSummary" name="evidenceSummary" defaultValue={draft?.evidenceSummary ?? ""} required rows={4} /></label>
            <label className={styles.independenceCheck}><input id="field-independentSourcesConfirmed" name="independentSourcesConfirmed" type="checkbox" required />I checked at least two independent original sources, not two copies of one report.</label>
          </fieldset>

          <PublicationChecklist candidate={candidate} />
          <StoryPreview candidate={{...candidate,mediaOptions}} />

          <div id="publish" className={styles.actionBar} role="group" aria-label="Publication actions">
            {scheduleAction && !published && <label>Schedule for (IST)<input name="scheduledFor" type="datetime-local" /></label>}
            {candidate.scheduledFor && <p>Scheduled for {candidate.scheduledFor}. Private saves preserve this approved version and time.</p>}
            <div>
              {saveDraftAction && <PendingButton disabled={protection.status === "Saving" || protection.status === "Conflict"} type="submit" name="intent" value="draft" intentValue="draft" pendingLabel="Saving draft…"  formNoValidate className={styles.secondary}>Save draft</PendingButton>}
              <PendingButton disabled={protection.status === "Saving" || protection.status === "Conflict"} type="submit" name="intent" value="story" intentValue="story" pendingLabel="Publishing…">{published ? "Update live post" : "Publish story"}</PendingButton>
              <PendingButton disabled={protection.status === "Saving" || protection.status === "Conflict"} type="submit" name="format" value="brief" intentField="format" intentValue="brief" pendingLabel="Publishing brief…" formNoValidate className={styles.secondary}>Publish brief</PendingButton>
              {scheduleAction && !published && <PendingButton disabled={protection.status === "Saving" || protection.status === "Conflict"} type="submit" name="intent" value="schedule" intentValue="schedule" pendingLabel={candidate.scheduledFor ? "Rescheduling…" : "Scheduling…"} className={styles.secondary}>{candidate.scheduledFor ? "Reschedule" : "Schedule"}</PendingButton>}
              {candidate.scheduledFor && scheduleAction && <><button type="submit" name="intent" value="update_schedule">Update scheduled version</button><button type="submit" name="intent" value="cancel_schedule" formNoValidate>Cancel schedule</button></>}
            </div>
          </div>
        </form>

        <aside className={styles.evidence} aria-labelledby="evidence-heading">
          <div className={styles.evidenceSticky}>
            {uploadMediaAction && <form className={styles.uploadForm} aria-label="Upload approved image" onSubmit={event => { event.preventDefault(); void protection.save(uploadMediaAction, new FormData(event.currentTarget)); }}>
              <h2>Upload a cover</h2>
              <input type="hidden" name="candidateId" value={candidate.id} />
              <label>Image file (JPEG, PNG or WebP, up to 10 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" required /></label>
              <label>Alt text<input name="alt" required /></label>
              <label>Original source URL<input name="sourceUrl" type="url" required /></label>
              <label>Credit line<input name="creditLine" required /></label>
              <label>Licence or permission record<input name="licenseCode" required /></label>
              <label className={styles.permissionCheck}><input name="commercialUseAllowed" type="checkbox" required />Commercial display is permitted</label>
              <label className={styles.permissionCheck}><input name="modificationAllowed" type="checkbox" />Resizing, cropping and lossy conversion are permitted</label>
              <label className={styles.permissionCheck}><input name="socialUseAllowed" type="checkbox" />Social sharing is permitted</label>
              <PendingButton type="submit" pendingLabel="Uploading…">Upload image</PendingButton>
            </form>}
            <header><h2 id="evidence-heading">Evidence</h2><span>{candidate.evidence.length} signals</span></header>
            <p>Open every source behind a factual claim before publishing.</p>
            <div className={styles.evidenceList}>{candidate.evidence.map((item) => <article key={item.id}>
              <div><span>{item.trustTier}</span><span data-availability={item.availability}>{item.availability}</span></div>
              <h3>{item.title}</h3><p>{item.sourceName}</p>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source: {item.sourceName}</a>
            </article>)}</div>

            <section className={styles.revisions} aria-labelledby="revisions-heading">
              <h2 id="revisions-heading">Revision history</h2>
              {candidate.revisions?.map((revision) => <p key={revision.revision}>Revision {revision.revision} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(revision.createdAt))}</p>)}
              {!candidate.revisions?.length && <p>No saved revisions yet.</p>}
            </section>

            <MoreActions searchCandidatesAction={searchCandidatesAction} run={protection.runExternal} candidate={{ ...candidate, editorialVersion: protection.currentVersion }} transitionAction={transitionAction} mergeAction={mergeAction} splitAction={splitAction} />
          </div>
        </aside>
      </div>
    </main>
  );
}
