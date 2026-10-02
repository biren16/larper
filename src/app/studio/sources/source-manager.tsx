import Link from "next/link";
import { PendingButton } from "../pending-button";
import { StatusNotice } from "../status-notice";
import type { StudioSource, StudioSourceStatus, StudioSourcesData } from "../studio-dashboard";
import styles from "./sources.module.css";

import { CULTURE_BEATS as beats } from "@/backend/ingestion/source-catalog";

const statusLabels: Record<StudioSourceStatus, string> = {
  live: "Live",
  review: "Usage review needed",
  stale: "Overdue",
  paused: "Paused",
  attention: "Needs attention",
  waiting: "Waiting",
  pending: "First collection pending",
  manual: "Manual intake",
};

const time = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Never";

type Action = (form: FormData) => void | Promise<void>;

function SourceRow({ source, toggleSourceAction, reviewSourceAction }: { source: StudioSource; toggleSourceAction?: Action; reviewSourceAction?: Action }) {
  const canToggle = source.status !== "waiting" && source.adapterType !== "manual";
  return (
    <article className={styles.sourceRow}>
      <div className={styles.sourceIdentity}>
        <span className={styles.status} data-status={source.status}>{statusLabels[source.status]}</span>
        <div><h3>{source.name}</h3><p>{source.adapterType} / {source.trustTier}</p></div>
      </div>
      <dl>
        <div><dt>Last collection</dt><dd>{time(source.lastPolledAt)}</dd></div>
        <div><dt>Usage review</dt><dd>{source.usageReviewed ? "Recorded" : "Required before collection"}</dd></div>
        <div><dt>Failures</dt><dd>{source.failureCount === 1 ? "1 unresolved failure" : `${source.failureCount} unresolved failures`}</dd></div>
      </dl>
      {toggleSourceAction && canToggle && (
        <form action={toggleSourceAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <input type="hidden" name="active" value={source.active ? "false" : "true"} />
          <PendingButton type="submit" disabled={!source.active && !source.usageReviewed} pendingLabel={source.active ? "Pausing…" : "Activating…"} aria-label={`${source.active ? "Pause" : "Activate"} ${source.name}`}>{source.active ? "Pause" : "Activate"}</PendingButton>
        </form>
      )}
      {reviewSourceAction && canToggle && <details className={styles.reviewPanel}>
        <summary>Review source usage</summary>
        <p>{source.usageNotes ?? "Record the permitted collection method and restrictions."}</p>
        {source.locator && <a href={source.locator} target="_blank" rel="noreferrer">Open source</a>}
        <form action={reviewSourceAction} aria-label={`Review usage for ${source.name}`}>
          <input type="hidden" name="sourceId" value={source.id} />
          <label>Terms or permission URL<input name="termsUrl" type="url" required defaultValue={source.usageReview?.termsUrl ?? ""} /></label>
          <label>Permission basis<textarea name="basis" required defaultValue={source.usageReview?.basis ?? ""} /></label>
          <label>Permitted usage and restrictions<textarea name="notes" required defaultValue={source.usageReview?.notes ?? ""} /></label>
          <PendingButton type="submit" pendingLabel="Recording review…">Record usage review</PendingButton>
        </form>
      </details>}
    </article>
  );
}

function SourceForm({ action }: { action?: (form: FormData) => void | Promise<void> }) {
  return (
    <section className={styles.configPanel} aria-labelledby="source-config-heading">
      <p className={styles.kicker}>Source configuration</p>
      <h2 id="source-config-heading">Add a source</h2>
      <p>New sources stay paused until you review their trust and scope.</p>
      <form action={action} aria-label="Add a source">
        <label>Source name<input name="name" required /></label>
        <div className={styles.formPair}>
          <label>Beat<select name="watchlistBeat" defaultValue="music">{beats.map((beat) => <option key={beat.id} value={beat.id}>{beat.label}</option>)}</select></label>
          <label>Adapter<select name="adapterType" defaultValue="rss"><option value="rss">RSS / Atom</option><option value="youtube">YouTube</option><option value="manual">Manual publisher reference</option></select></label>
        </div>
        <label>Trust tier<select name="trustTier" defaultValue="publication"><option value="publication">Publication</option><option value="primary">Primary</option><option value="community">Community</option><option value="watchlist">Watchlist</option></select></label>
        <label>Feed URL, channel ID, or search query<input name="locator" required /></label>
        <div className={styles.formPair}>
          <label>Locale<input name="locale" defaultValue="en" required /></label>
          <label>Region<input name="region" defaultValue="global" required /></label>
        </div>
        <label className={styles.checkbox}><input name="allowlisted" type="checkbox" /> Allow for brief corroboration</label>
        <PendingButton type="submit" pendingLabel="Adding source…">Add paused source</PendingButton>
      </form>
    </section>
  );
}

export function SourceManager({
  data,
  createSourceAction,
  toggleSourceAction,
  reviewSourceAction,
  registerPresetsAction,
  notice,
  error,
}: {
  data: StudioSourcesData;
  createSourceAction?: (form: FormData) => void | Promise<void>;
  toggleSourceAction?: (form: FormData) => void | Promise<void>;
  reviewSourceAction?: Action;
  registerPresetsAction?: Action;
  notice?: string;
  error?: string;
}) {
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Studio / sources</p><h1>Watchlists</h1><p>Keep collection narrow, credible, and useful to the editorial desk.</p></div>
        <Link href="/studio">Back to Studio</Link>
      </header>
      <StatusNotice notice={notice} error={error} />
      {registerPresetsAction && <form action={registerPresetsAction} className={styles.configPanel}>
        <p>Register 21 feed presets and four manual references across these seven lanes. Existing source settings are preserved.</p>
        <PendingButton type="submit" pendingLabel="Registering sources…">Register seven-lane sources</PendingButton>
      </form>}

      <div className={styles.workspace}>
        <div className={styles.beatList}>
          {beats.map((beat) => {
            const sources = data.sources.filter((source) => source.watchlistBeat === beat.id);
            return (
              <section key={beat.id} className={styles.beat} role="region" aria-labelledby={`${beat.id}-heading`} aria-label={`${beat.label} sources`}>
                <header><div><h2 id={`${beat.id}-heading`}>{beat.label}</h2><p>{beat.description}</p></div><span>{sources.length}</span></header>
                {sources.map((source) => <SourceRow key={source.id} source={source} toggleSourceAction={toggleSourceAction} reviewSourceAction={reviewSourceAction} />)}
                {sources.length === 0 && <p className={styles.empty}>No source is assigned to this beat yet.</p>}
                {beat.id === "internet-culture" && <div className={styles.manualCallout}><p>Original creator links stay human-led. Add public evidence without unsupported scraping.</p><Link href="/studio#signal-composer">Capture an internet signal</Link></div>}
              </section>
            );
          })}
          {data.sources.some((source) => !beats.some((beat) => beat.id === source.watchlistBeat)) && <section className={styles.beat} aria-label="Other registered sources">
            <h2>Other registered sources</h2><p>Existing registry history outside these seven lanes.</p>
            {data.sources.filter((source) => !beats.some((beat) => beat.id === source.watchlistBeat)).map((source) => <SourceRow key={source.id} source={source} toggleSourceAction={toggleSourceAction} reviewSourceAction={reviewSourceAction} />)}
          </section>}
        </div>
        <aside><SourceForm action={createSourceAction} /></aside>
      </div>

      <section id="operations" className={styles.operations} aria-labelledby="operations-heading">
        <div><p className={styles.kicker}>Operations</p><h2 id="operations-heading">Recent collection runs</h2></div>
        <div className={styles.runList}>
          {data.runs.map((run) => <article key={run.id}><span data-status={run.status}>{run.status}</span><time>{time(run.startedAt)}</time><strong>{run.insertedCount} added</strong><strong>{run.errorCount} errors</strong></article>)}
          {data.runs.length === 0 && <p className={styles.empty}>No collection runs recorded yet.</p>}
        </div>
      </section>
    </main>
  );
}
