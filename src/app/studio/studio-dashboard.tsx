import { CULTURE_BEATS } from "@/backend/ingestion/source-catalog";
import Link from "next/link";
import { SignalComposer, SignalComposerLink } from "./signal-composer";
import { StatusNotice } from "./status-notice";
import styles from "./studio.module.css";

export interface StudioDashboardData {
  taskCounts?: {drafts:number;scheduled:number;needsReview:number;published:number};
  niches?: Array<{ id: string; name: string }>;
  candidates: Array<{ id: string; title: string; nicheName: string; heat: number; confidence: number; state: string; sourceCount: number; lastCheckedAt: string; sensitiveFlags: string[] }>;
  sources: StudioSource[];
  runs: Array<{ id: string; status: string; startedAt: string; insertedCount: number; errorCount: number }>;
  recentSignals: Array<{ id: string; title: string; canonicalUrl: string; sourceName: string; sourceType: string; nicheName: string; region: string; observedAt: string; availability: string; clusterId: string | null }>;
}

export type StudioSourceStatus = "live" | "stale" | "paused" | "attention" | "waiting" | "pending" | "manual" | "review";

export interface StudioSource {
  id: string;
  name: string;
  adapterType: string;
  watchlistBeat?: string | null;
  active: boolean;
  healthy: boolean;
  lastPolledAt: string | null;
  failureCount: number;
  expectedNextPollAt?: string | null;
  failures?: Array<{message:string;code:string;occurredAt:string}>;
  trustTier: string;
  status: StudioSourceStatus;
  config?: Record<string, unknown>;
  locator?: string;
  usageNotes?: string;
  usageReviewed?: boolean;
  usageReview?: { termsUrl: string; basis: string; notes: string };

}

export interface StudioSourcesData {
  registration?: {registered:number;expected:number};
  sources: StudioSource[];
  runs: StudioDashboardData["runs"];
}

const time = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Never";

function ReviewQueue({ candidates }: Pick<StudioDashboardData, "candidates">) {
  return (
    <section className={styles.queue} aria-labelledby="queue-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.kicker}>Ranked by heat</p><h2 id="queue-heading">Review queue</h2><p className={styles.queueIntro}>Open a candidate to check its evidence and start writing. Heat measures attention; it does not establish accuracy.</p><Link className={styles.reviewLink} href="/studio/posts">Browse all posts</Link></div>
        <span>{candidates.length} {candidates.length === 1 ? "candidate" : "candidates"}</span>
      </div>
      <div className={styles.candidateList}>
        {candidates.slice(0,8).map((candidate) => (
          <article className={styles.candidate} key={candidate.id}>
            <div className={styles.candidateCopy}>
              <p className={styles.meta}>{candidate.nicheName} / {candidate.state.replaceAll("_", " ")}</p>
              <h3><Link href={`/studio/candidates/${candidate.id}`}>{candidate.title}</Link></h3>
              <p className={styles.checked}>Checked {time(candidate.lastCheckedAt)}</p>
              {candidate.sensitiveFlags.length > 0 && <p className={styles.warning}>Mandatory review: {candidate.sensitiveFlags.join(", ")}</p>}
            </div>
            <dl className={styles.metrics}>
              <div><dt>Heat</dt><dd>{candidate.heat}</dd></div>
              <div><dt>Confidence</dt><dd>{candidate.confidence}</dd></div>
              <div><dt>Linked signals</dt><dd>{candidate.sourceCount}</dd></div>
            </dl>
            <Link className={styles.reviewLink} href={`/studio/candidates/${candidate.id}`}>Review</Link>
          </article>
        ))}
        {candidates.length === 0 && (
          <div className={styles.emptyState}>
            <div><strong>The desk is clear.</strong><p>Capture a public signal now, or return after the next collection run.</p></div>
            <SignalComposerLink>Add first signal</SignalComposerLink>
          </div>
        )}
      </div>
    </section>
  );
}

function RecentEvidence({ signals }: { signals: StudioDashboardData["recentSignals"] }) {
  return (
    <section className={styles.recent} aria-labelledby="recent-heading">
      <div className={styles.sectionHeading}>
        <div><p className={styles.kicker}>Evidence inbox</p><h2 id="recent-heading">Recently captured</h2></div>
        <span>Latest {signals.length}</span>
      </div>
      {signals.length > 0 ? <div className={styles.signalList}>
        {signals.map((signal) => (
          <article className={styles.signalRow} key={signal.id}>
            <div><p className={styles.meta}>{signal.nicheName} / {signal.region}</p><h3>{signal.title}</h3><p>{signal.sourceName} · {signal.sourceType} · {time(signal.observedAt)}</p></div>
            <span data-availability={signal.availability}>{signal.availability}</span>
            <div className={styles.signalLinks}>
              <a href={signal.canonicalUrl} target="_blank" rel="noreferrer">Open captured source</a>
              {signal.clusterId && <Link href={`/studio/candidates/${signal.clusterId}`}>Open candidate</Link>}
            </div>
          </article>
        ))}
      </div> : <p className={styles.quietEmpty}>No captured evidence yet. Your next manual or scheduled signal will appear here.</p>}
    </section>
  );
}

function WatchlistSummary({ sources }: Pick<StudioDashboardData, "sources">) {
  return (
    <section className={styles.watchlist} aria-labelledby="watchlist-heading">
      <div><p className={styles.kicker}>Watchlist</p><h2 id="watchlist-heading">Coverage at a glance</h2><p className={styles.meta}>Live feeds after successful collection</p></div>
      <ul>{CULTURE_BEATS.map((beat) => <li key={beat.id}><span>{beat.label}</span><strong>{sources.filter((source) => source.watchlistBeat === beat.id && source.status === "live").length}</strong></li>)}</ul>
      <Link href="/studio/sources">Manage sources</Link>
    </section>
  );
}

export function StudioDashboard({
  data,
  manualSignalAction,
  notice,
  error,
}: {
  data: StudioDashboardData;
  manualSignalAction?: (form: FormData) => void | Promise<void>;
  notice?: string;
  error?: string;
}) {
  const latestRun = data.runs[0];
  const failingSources=data.sources.filter(source=>source.failureCount>0).length;
  const issues=data.sources.filter(source=>source.failureCount>0 || !source.usageReviewed && ["rss","youtube"].includes(source.adapterType)).length;
  const unreviewed=data.sources.filter(source=>!source.usageReviewed && ["rss","youtube"].includes(source.adapterType)).length;
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p className={styles.kicker}>Founder workspace</p><h1>Studio</h1></div>
        <div className={styles.collectionStatus} data-status={latestRun?.status ?? "idle"}>
          <span>Last collection</span>
          <strong>{failingSources ? `${failingSources} ${failingSources===1?"source needs":"sources need"} attention` : latestRun ? latestRun.status.replaceAll("_", " ") : "Waiting"}</strong>
          <time>{latestRun ? time(latestRun.startedAt) : "No run yet"}</time>
        </div>
      </header>

      <StatusNotice notice={notice} error={error} />
      {latestRun?.status === "failed" && !error && <div className={styles.pipelineNotice} role="status"><strong>Collection needs attention.</strong><span>{latestRun.errorCount} errors in the latest run.</span><Link href="/studio/sources#operations">Review operations</Link></div>}

      <section className={styles.tasks} aria-label="Daily tasks">
        <Link href="/studio/posts?tab=draft"><strong>{data.taskCounts?.drafts ?? "Open"}</strong><span>Drafts</span><small>Continue writing</small></Link>
        <Link href="/studio/posts?tab=scheduled"><strong>{data.taskCounts?.scheduled ?? "Open"}</strong><span>Scheduled</span><small>Check upcoming releases</small></Link>
        <Link href="/studio/posts?tab=needs_review"><strong>{data.taskCounts?.needsReview ?? "Open"}</strong><span>Needs review</span><small>Refresh published evidence</small></Link>
        <Link aria-label="Review source issues" href="/studio/sources?filter=issues"><strong>{issues}</strong><span>Review source issues</span><small>{unreviewed} awaiting usage review</small></Link>
      </section>
      <div className={styles.deskGrid}>
        <div className={styles.primaryDesk}>
          <ReviewQueue candidates={data.candidates} />
          <RecentEvidence signals={data.recentSignals} />
        </div>
        <aside className={styles.composerRail} aria-label="Signal capture">
          <SignalComposer niches={data.niches ?? []} sources={data.sources} action={manualSignalAction} />
        </aside>
      </div>

      <WatchlistSummary sources={data.sources} />
    </main>
  );
}
