import Link from "next/link";
import styles from "./story-editor.module.css";
import { StoryPreview } from "./story-preview";

export interface StudioCandidateDetail {
  id: string;
  title: string;
  nicheId: string | null;
  heat: number;
  confidence: number;
  sensitiveFlags: string[];
  evidence: Array<{ id: string; title: string; sourceName: string; sourceUrl: string; trustTier: string; availability: string }>;
  revisions?: Array<{ revision: number; createdAt: string; editorId: string }>;
}

type Action = (formData: FormData) => void | Promise<void>;

function MoreActions({ candidate, transitionAction, mergeAction, splitAction }: { candidate: StudioCandidateDetail; transitionAction?: Action; mergeAction?: Action; splitAction?: Action }) {
  if (!transitionAction && !mergeAction && !splitAction) return null;
  return (
    <details className={styles.moreActions} role="group" aria-label="More actions">
      <summary>More actions</summary>
      <p>These actions change the cluster or remove it from the editorial flow.</p>
      {mergeAction && <form action={mergeAction}><input type="hidden" name="targetId" value={candidate.id} /><label>Duplicate cluster ID<input name="sourceId" required /></label><button type="submit">Merge into this cluster</button></form>}
      {splitAction && <form action={splitAction}><input type="hidden" name="clusterId" value={candidate.id} /><label>Signal IDs to move<input name="signalIds" required placeholder="id-1,id-2" /></label><button type="submit">Split evidence</button></form>}
      {transitionAction && <form action={transitionAction}><input type="hidden" name="candidateId" value={candidate.id} /><label>Review note<textarea name="notes" required rows={3} /></label><div className={styles.secondaryActions}><button type="submit" name="action" value="reject">Reject</button><button type="submit" name="action" value="expire">Expire</button><button type="submit" name="action" value="unpublish">Unpublish</button></div></form>}
    </details>
  );
}

export function StoryEditor({
  candidate,
  publishAction,
  error,
  transitionAction,
  mergeAction,
  splitAction,
  scheduleAction,
}: {
  candidate: StudioCandidateDetail;
  publishAction?: Action;
  error?: string;
  transitionAction?: Action;
  mergeAction?: Action;
  splitAction?: Action;
  scheduleAction?: Action;
}) {
  return (
    <main id="main-content" className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Studio breadcrumb"><Link href="/studio">Studio</Link><span>/</span><span>Candidate</span></nav>
      <header className={styles.header}>
        <div><p>{candidate.nicheId ?? "Unassigned"}</p><h1>{candidate.title}</h1></div>
        <dl>
          <div><dt>Heat</dt><dd>{candidate.heat}</dd></div>
          <div><dt>Confidence</dt><dd>{candidate.confidence}</dd></div>
          <div><dt>Evidence</dt><dd>{candidate.evidence.length} signals</dd></div>
          <div><dt>Review</dt><dd>{candidate.sensitiveFlags.length > 0 ? "Mandatory" : "Standard"}</dd></div>
        </dl>
      </header>

      {candidate.sensitiveFlags.length > 0 && <div className={styles.alert} role="alert"><strong>Mandatory review</strong><span>{candidate.sensitiveFlags.join(", ")}</span></div>}
      {error && <div className={styles.alert} role="alert"><strong>Could not complete that action</strong><span>{error}</span></div>}

      <div className={styles.workspace}>
        <form className={styles.editor} action={publishAction} aria-label="Story editor">
          <input type="hidden" name="candidateId" value={candidate.id} />

          <fieldset>
            <legend>Story</legend>
            <label>Title<input name="title" required maxLength={140} defaultValue={candidate.title} /></label>
            <label>Hook<textarea name="hook" required rows={3} /></label>
            <label>What happened?<textarea name="summary" required rows={5} /></label>
          </fieldset>

          <fieldset>
            <legend>Context</legend>
            <label>Why people care<textarea name="whyItMatters" required rows={5} /></label>
            <label>The lore<textarea name="lore" required rows={7} /></label>
            <label>If you’re new<textarea name="beginnerContext" required rows={4} /></label>
            <label>Say this in the group chat<textarea name="conversationLine" required rows={3} placeholder="The useful line a reader can repeat without faking expertise." /></label>
          </fieldset>

          <fieldset>
            <legend>Classification</legend>
            <div className={styles.twoCol}>
              <label>Niche ID<input name="nicheId" required defaultValue={candidate.nicheId ?? ""} /></label>
              <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
            </div>
            <div className={styles.twoCol}>
              <label>Discovery type<select name="discoveryType" defaultValue="TREND"><option>TREND</option><option>MEME</option><option>DROP</option><option>LORE</option><option>DEBATE</option><option>COMEBACK</option><option>PRODUCT</option><option>EVENT</option><option>PERSON</option><option>AESTHETIC</option><option>DRAMA</option><option>RABBIT_HOLE</option></select></label>
              <label>Mode<select name="mode" defaultValue="current"><option value="current">Current</option><option value="deep-lore">Deep Lore</option></select></label>
            </div>
            <div className={styles.twoCol}><label>Regions<input name="regions" required defaultValue="india,global" /></label><label>Freshness label<input name="freshnessLabel" required /></label></div>
            <label>Tags<input name="tags" placeholder="books,f1,romance" /></label>
          </fieldset>

          <fieldset>
            <legend>Evidence summary</legend>
            <label>What the sources establish<textarea name="evidenceSummary" required rows={4} /></label>
          </fieldset>

          <StoryPreview />

          <div className={styles.actionBar} role="group" aria-label="Publication actions">
            {scheduleAction && <label>Schedule for (IST)<input name="scheduledFor" type="datetime-local" /></label>}
            <div>
              <button type="submit">Publish story</button>
              <button type="submit" name="format" value="brief" formNoValidate className={styles.secondary}>Publish brief</button>
              {scheduleAction && <button type="submit" formAction={scheduleAction} className={styles.secondary}>Schedule</button>}
            </div>
          </div>
        </form>

        <aside className={styles.evidence} aria-labelledby="evidence-heading">
          <div className={styles.evidenceSticky}>
            <header><h2 id="evidence-heading">Evidence</h2><span>{candidate.evidence.length} independent signals</span></header>
            <p>Open every source behind a factual claim before publishing.</p>
            <div className={styles.evidenceList}>{candidate.evidence.map((item) => <article key={item.id}>
              <div><span>{item.trustTier}</span><span data-availability={item.availability}>{item.availability}</span></div>
              <h3>{item.title}</h3><p>{item.sourceName}</p>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source: {item.sourceName}</a>
            </article>)}</div>

            <section className={styles.revisions} aria-labelledby="revisions-heading">
              <h2 id="revisions-heading">Revision history</h2>
              {candidate.revisions?.map((revision) => <p key={revision.revision}>Revision {revision.revision} · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(revision.createdAt))}</p>)}
              {!candidate.revisions?.length && <p>No published revisions yet.</p>}
            </section>

            <MoreActions candidate={candidate} transitionAction={transitionAction} mergeAction={mergeAction} splitAction={splitAction} />
          </div>
        </aside>
      </div>
    </main>
  );
}
