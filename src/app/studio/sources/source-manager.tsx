"use client";
import { useState } from "react";
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
  const grouped = [...new Map((source.failures ?? []).map(failure => [failure.message, failure])).values()];
  const latest = [...(source.failures ?? [])].sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt))[0];
  const explanation = latest?.message.toLowerCase().includes("redirect") ? "The feed URL redirects. Use the publisher’s final feed URL before collecting again." : latest?.message.toLowerCase().includes("403") ? "The publisher blocked collection. Check its access policy and use manual intake if automated collection is restricted." : latest?.message.toLowerCase().includes("timed out") ? "The publisher did not respond in time. Check the source before the next collection." : latest?.message;
  const canToggle = source.status !== "waiting" && source.adapterType !== "manual";
  return (
    <article id={`source-${source.id}`} className={styles.sourceRow}>
      <div className={styles.sourceIdentity}>
        <span className={styles.status} data-status={source.status}>{statusLabels[source.status]}</span>
        <div><h3>{source.name}</h3><p>{source.adapterType} / {source.trustTier}</p></div>
      </div>
      <dl>
        <div><dt>Last collection</dt><dd>{time(source.lastPolledAt)}</dd></div>
        <div><dt>Expected next collection</dt><dd>{source.expectedNextPollAt ? time(source.expectedNextPollAt) : source.adapterType === "manual" ? "Manual intake — no polling" : !source.active ? "Paused — no collection scheduled" : !source.usageReviewed ? "Usage review required" : "Next collector run (first collection pending)"}</dd></div>
        <div><dt>Usage review</dt><dd>{source.usageReviewed ? "Recorded" : "Required before collection"}</dd></div>
        <div><dt>Failures</dt><dd>{source.failureCount === 1 ? "1 unresolved failure" : `${source.failureCount} unresolved failures`}</dd></div>
      </dl>
      {latest && <div className={styles.failureSummary}><p>{explanation}</p><details><summary>Failure diagnostics ({source.failureCount} unresolved)</summary>{grouped.map(failure=><p key={failure.message}>{failure.message}<br/><small>{failure.code} · {time(failure.occurredAt)} · {(source.failures ?? []).filter(item=>item.message===failure.message).length} occurrences</small></p>)}</details></div>}
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
  initialFilter = "all",
}: {
  data: StudioSourcesData;
  createSourceAction?: (form: FormData) => void | Promise<void>;
  toggleSourceAction?: (form: FormData) => void | Promise<void>;
  reviewSourceAction?: Action;
  registerPresetsAction?: Action;
  notice?: string;
  error?: string;
  initialFilter?: string;
}) {
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState(initialFilter);
  const failing=data.sources.filter(source=>source.failureCount>0);
  const reviewNeeded=data.sources.filter(source=>!source.usageReviewed && ["rss","youtube"].includes(source.adapterType));
  const visible=data.sources.filter(source=>source.name.toLowerCase().includes(search.toLowerCase()) && (filter==="all" || filter==="issues" && (source.failureCount>0 || !source.usageReviewed && ["rss","youtube"].includes(source.adapterType)) || filter==="attention" && source.failureCount>0 || filter==="review" && !source.usageReviewed && ["rss","youtube"].includes(source.adapterType) || filter==="active" && source.active || filter==="paused" && !source.active));
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Studio / sources</p><h1>Sources</h1><p>Manage collection, review permissions, and resolve feed problems.</p></div>
        <Link href="/studio">Back to Studio</Link>
      </header>
      <StatusNotice notice={notice} error={error} />
      <p role="status">{data.registration ? `${data.registration.registered} of ${data.registration.expected} sources registered` : "Source registry loaded"}</p>
      {registerPresetsAction && <details className={styles.configPanel} open={data.registration ? data.registration.registered < data.registration.expected : true}><summary>Setup controls</summary><form action={registerPresetsAction}>
        <p>Register 21 feed presets and four manual references across these seven lanes. Existing source settings are preserved.</p>
        <PendingButton type="submit" pendingLabel="Registering sources…">Register seven-lane sources</PendingButton>
      </form></details>}
      <div className={styles.toolbar}>
        <div className={styles.filters} aria-label="Source filters">{[["all",`All sources (${data.sources.length})`],["issues","Needs attention"],["attention",`Failures (${failing.length})`],["review",`Usage review (${reviewNeeded.length})`],["active","Active"],["paused","Paused"]].map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
        <label>Search sources<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Publisher or creator name"/></label>
      </div>
      <p className={styles.filterResult} role="status">{visible.length} sources shown{filter==="review" ? " · Record permission before activating automated collection." : filter==="attention" ? " · Open diagnostics or pause a failing source while investigating." : ""}</p>
      <details className={styles.addSource}><summary>Add a source</summary><SourceForm action={createSourceAction}/></details>

      <div className={styles.workspace}>
        <div className={styles.beatList}>
          {beats.map((beat) => {
            const sources = visible.filter((source) => source.watchlistBeat === beat.id);
            if (!sources.length) return null;
            return (
              <section key={beat.id} className={styles.beat} role="region" aria-labelledby={`${beat.id}-heading`} aria-label={`${beat.label} sources`}>
                <header><div><h2 id={`${beat.id}-heading`}>{beat.label}</h2><p>{beat.description}</p></div><span>{sources.length}</span></header>
                {sources.map((source) => <SourceRow key={source.id} source={source} toggleSourceAction={toggleSourceAction} reviewSourceAction={reviewSourceAction} />)}
                {sources.length === 0 && <p className={styles.empty}>No source is assigned to this beat yet.</p>}
                {beat.id === "internet-culture" && <div className={styles.manualCallout}><p>Original creator links stay human-led. Add public evidence without unsupported scraping.</p><Link href="/studio#signal-composer">Capture an internet signal</Link></div>}
              </section>
            );
          })}
          {visible.some((source) => !beats.some((beat) => beat.id === source.watchlistBeat)) && <section className={styles.beat} aria-label="Other registered sources">
            <h2>Other registered sources</h2><p>Existing registry history outside these seven lanes.</p>
            {visible.filter((source) => !beats.some((beat) => beat.id === source.watchlistBeat)).map((source) => <SourceRow key={source.id} source={source} toggleSourceAction={toggleSourceAction} reviewSourceAction={reviewSourceAction} />)}
          </section>}
        </div>
        {visible.length===0 && <p className={styles.empty}>No sources match. Try another filter or search.</p>}
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
