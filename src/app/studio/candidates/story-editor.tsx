import styles from "./story-editor.module.css";

export interface StudioCandidateDetail {
  id: string;
  title: string;
  nicheId: string | null;
  heat: number;
  confidence: number;
  sensitiveFlags: string[];
  evidence: Array<{ id: string; title: string; sourceName: string; sourceUrl: string; trustTier: string; availability: string }>;
}

export function StoryEditor({
  candidate,
  publishAction,
}: {
  candidate: StudioCandidateDetail;
  publishAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p>Candidate / {candidate.nicheId ?? "Unassigned"}</p><h1>{candidate.title}</h1></div>
        <dl><div><dt>Heat</dt><dd>{candidate.heat}</dd></div><div><dt>Confidence</dt><dd>{candidate.confidence}</dd></div><div><dt>Signals</dt><dd>{candidate.evidence.length}</dd></div></dl>
      </header>
      {candidate.sensitiveFlags.length > 0 && <div className={styles.alert} role="alert"><strong>Mandatory review</strong><p>{candidate.sensitiveFlags.join(", ")}</p></div>}
      <div className={styles.workspace}>
        <form className={styles.editor} action={publishAction} aria-label="Story editor">
          <input type="hidden" name="candidateId" value={candidate.id} />
          <div className={styles.twoCol}>
            <label>Niche ID<input name="nicheId" required defaultValue={candidate.nicheId ?? ""} /></label>
            <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          </div>
          <label>Title<input name="title" required maxLength={140} defaultValue={candidate.title} /></label>
          <label>Hook<textarea name="hook" required rows={3} /></label>
          <label>What happened?<textarea name="summary" required rows={5} /></label>
          <label>Why people care<textarea name="whyItMatters" required rows={5} /></label>
          <label>The lore<textarea name="lore" required rows={7} /></label>
          <label>If you’re new<textarea name="beginnerContext" required rows={4} /></label>
          <div className={styles.twoCol}>
            <label>Discovery type<select name="discoveryType" defaultValue="TREND"><option>TREND</option><option>MEME</option><option>DROP</option><option>LORE</option><option>DEBATE</option><option>COMEBACK</option><option>PRODUCT</option><option>EVENT</option><option>PERSON</option><option>AESTHETIC</option><option>DRAMA</option><option>RABBIT_HOLE</option></select></label>
            <label>Mode<select name="mode" defaultValue="current"><option value="current">Current</option><option value="deep-lore">Deep Lore</option></select></label>
          </div>
          <div className={styles.twoCol}><label>Regions<input name="regions" required defaultValue="india,global" /></label><label>Freshness label<input name="freshnessLabel" required /></label></div>
          <label>Evidence summary<textarea name="evidenceSummary" required rows={3} /></label>
          <label>Tags<input name="tags" placeholder="books,f1,romance" /></label>
          <div className={styles.actionBar}><button type="submit">Publish story</button><button type="submit" name="format" value="brief" className={styles.secondary}>Publish brief</button></div>
        </form>
        <aside className={styles.evidence} aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">Evidence</h2>
          <p>Independent sources only. Open every factual source before publishing.</p>
          {candidate.evidence.map((item) => <article key={item.id}>
            <div><span>{item.trustTier}</span><span>{item.availability}</span></div>
            <h3>{item.title}</h3><p>{item.sourceName}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source: {item.sourceName}</a>
          </article>)}
        </aside>
      </div>
    </main>
  );
}
