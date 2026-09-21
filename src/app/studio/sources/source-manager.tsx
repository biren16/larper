import Link from "next/link";
import { StatusNotice } from "../status-notice";
import type { StudioSource, StudioSourceStatus, StudioSourcesData } from "../studio-dashboard";
import styles from "./sources.module.css";

const beats = [
  { id: "f1", label: "F1", description: "Race weekends, drivers, teams, and the culture around the grid." },
  { id: "books", label: "Books", description: "Reading communities, breakout titles, adaptations, and fandom crossovers." },
  { id: "music", label: "Music", description: "Releases, fan movements, tours, and sounds crossing into culture." },
  { id: "tech-gaming", label: "Tech + gaming", description: "Games, devices, creators, and internet-native product moments." },
  { id: "internet-culture", label: "Internet culture", description: "Founder-led capture for memes, style, food, places, and hard-to-access platforms." },
] as const;

const statusLabels: Record<StudioSourceStatus, string> = {
  live: "Live",
  paused: "Paused",
  attention: "Needs attention",
  waiting: "Waiting",
};

const time = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Never";

function SourceRow({ source, toggleSourceAction }: { source: StudioSource; toggleSourceAction?: (form: FormData) => void | Promise<void> }) {
  const canToggle = source.status !== "waiting" && source.adapterType !== "manual";
  return (
    <article className={styles.sourceRow}>
      <div className={styles.sourceIdentity}>
        <span className={styles.status} data-status={source.status}>{statusLabels[source.status]}</span>
        <div><h3>{source.name}</h3><p>{source.adapterType} / {source.trustTier}</p></div>
      </div>
      <dl>
        <div><dt>Last collection</dt><dd>{time(source.lastPolledAt)}</dd></div>
        <div><dt>Failures</dt><dd>{source.failureCount === 1 ? "1 unresolved failure" : `${source.failureCount} unresolved failures`}</dd></div>
      </dl>
      {toggleSourceAction && canToggle && (
        <form action={toggleSourceAction}>
          <input type="hidden" name="sourceId" value={source.id} />
          <input type="hidden" name="active" value={source.active ? "false" : "true"} />
          <button type="submit" aria-label={`${source.active ? "Pause" : "Activate"} ${source.name}`}>{source.active ? "Pause" : "Activate"}</button>
        </form>
      )}
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
          <label>Beat<select name="watchlistBeat" defaultValue="f1"><option value="f1">F1</option><option value="books">Books</option><option value="music">Music</option><option value="tech-gaming">Tech + gaming</option></select></label>
          <label>Adapter<select name="adapterType" defaultValue="rss"><option value="rss">RSS / Atom</option><option value="youtube">YouTube</option></select></label>
        </div>
        <label>Trust tier<select name="trustTier" defaultValue="publication"><option value="publication">Publication</option><option value="primary">Primary</option><option value="community">Community</option><option value="watchlist">Watchlist</option></select></label>
        <label>Feed URL, channel ID, or search query<input name="locator" required /></label>
        <div className={styles.formPair}>
          <label>Locale<input name="locale" defaultValue="en-IN" required /></label>
          <label>Region<input name="region" defaultValue="india" required /></label>
        </div>
        <label className={styles.checkbox}><input name="allowlisted" type="checkbox" /> Allow for brief corroboration</label>
        <button type="submit">Add paused source</button>
      </form>
    </section>
  );
}

export function SourceManager({
  data,
  createSourceAction,
  toggleSourceAction,
  notice,
  error,
}: {
  data: StudioSourcesData;
  createSourceAction?: (form: FormData) => void | Promise<void>;
  toggleSourceAction?: (form: FormData) => void | Promise<void>;
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

      <div className={styles.workspace}>
        <div className={styles.beatList}>
          {beats.map((beat) => {
            const sources = data.sources.filter((source) => source.watchlistBeat === beat.id);
            return (
              <section key={beat.id} className={styles.beat} role="region" aria-labelledby={`${beat.id}-heading`} aria-label={`${beat.label} sources`}>
                <header><div><h2 id={`${beat.id}-heading`}>{beat.label}</h2><p>{beat.description}</p></div><span>{sources.length}</span></header>
                {sources.map((source) => <SourceRow key={source.id} source={source} toggleSourceAction={toggleSourceAction} />)}
                {sources.length === 0 && <p className={styles.empty}>No source is assigned to this beat yet.</p>}
                {beat.id === "internet-culture" && <div className={styles.manualCallout}><p>Instagram, TikTok, Reddit, style, and places stay human-led. Add public evidence without unsupported scraping.</p><Link href="/studio#signal-composer">Capture an internet signal</Link></div>}
              </section>
            );
          })}
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
