import Link from "next/link";
import styles from "./studio.module.css";

export interface StudioDashboardData {
  niches?: Array<{ id: string; name: string }>;
  candidates: Array<{ id: string; title: string; nicheName: string; heat: number; confidence: number; state: string; sourceCount: number; lastCheckedAt: string; sensitiveFlags: string[] }>;
  sources: Array<{ id: string; name: string; adapterType: string; watchlistBeat?: string | null; active: boolean; healthy: boolean; lastPolledAt: string | null; failureCount: number }>;
  runs: Array<{ id: string; status: string; startedAt: string; insertedCount: number; errorCount: number }>;
}

const time = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Never";

export function StudioDashboard({ data, manualSignalAction, createSourceAction, toggleSourceAction }: { data: StudioDashboardData; manualSignalAction?: (form: FormData) => void | Promise<void>; createSourceAction?: (form: FormData) => void | Promise<void>; toggleSourceAction?: (form: FormData) => void | Promise<void> }) {
  const latestRun = data.runs[0];
  const activeSources = data.sources.filter((source) => source.active).length;
  const healthySources = data.sources.filter((source) => source.healthy).length;
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>LARPer / founder desk</p><h1>Signal desk</h1><p>Find the thing worth talking about. Keep the proof close.</p></div>
        <div className={styles.today}>
          <span>Today</span>
          <strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date())}</strong>
        </div>
      </header>

      <section className={styles.statusStrip} aria-label="Desk status">
        <p><strong>{data.candidates.length}</strong> in review</p>
        <p><strong>{activeSources}</strong> active sources</p>
        <p><strong>{healthySources}/{data.sources.length}</strong> sources healthy</p>
        <p className={styles.runNote} data-status={latestRun?.status ?? "idle"}>{latestRun ? `${latestRun.insertedCount} new signals in the latest run` : "Waiting for the first run"}</p>
      </section>

      <section className={styles.inbox} aria-labelledby="manual-heading">
        <div className={styles.inboxIntro}><p className={styles.eyebrow}>Evidence inbox</p><h2 id="manual-heading">Add a signal</h2><p>Paste a public link. Add what you are seeing. The desk keeps the receipts.</p></div>
        <form className={styles.manualForm} aria-label="Add a manual signal" action={manualSignalAction}>
          <div className={styles.signalTopRow}><label>Platform<select name="platform" defaultValue="instagram"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="reddit">Reddit</option><option value="x">X</option><option value="youtube">YouTube</option><option value="web">Web</option></select></label><label className={styles.urlField}>Public URL<input name="url" type="url" required placeholder="https://…" /></label></div>
          <label>What is moving?<input name="title" required maxLength={180} placeholder="The one-line version of the moment" /></label>
          <div className={styles.signalMeta}><label>Source name<input name="sourceName" required placeholder="Account, publication, or creator" /></label><label>Niche<select name="suggestedNicheId" defaultValue=""><option value="">Choose later</option>{data.niches?.map((niche) => <option key={niche.id} value={niche.id}>{niche.name}</option>)}</select></label><label>Region<select name="region" defaultValue="india"><option value="india">India</option><option value="global">Global</option></select></label></div>
          <label>Your read on the moment<textarea name="observationNote" rows={3} placeholder="What is making this feel real, not just loud?" /></label>
          <div className={styles.submitRow}><label>Published at<input name="publishedAt" type="datetime-local" required /></label><button type="submit">Add to evidence inbox</button></div>
        </form>
      </section>

      <section className={styles.queue} aria-labelledby="queue-heading">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Evidence is ranked, not assumed</p><h2 id="queue-heading">Review queue</h2></div><span>{data.candidates.length} candidates</span></div>
        <div className={styles.candidateList}>
          {data.candidates.map((candidate) => (
            <article className={styles.candidate} key={candidate.id}>
              <div><p className={styles.niche}>{candidate.nicheName} · {candidate.state.replaceAll("_", " ")}</p><h3>{candidate.title}</h3><p className={styles.checked}>Checked {time(candidate.lastCheckedAt)}</p>{candidate.sensitiveFlags.length > 0 && <p className={styles.warning}>Review required: {candidate.sensitiveFlags.join(", ")}</p>}</div>
              <div className={styles.metrics}><strong>{candidate.heat} heat</strong><span>{candidate.confidence} confidence</span><span>{candidate.sourceCount} sources</span></div>
              <Link className={styles.reviewLink} href={`/studio/candidates/${candidate.id}`}>Review evidence</Link>
            </article>
          ))}
          {data.candidates.length === 0 && <p className={styles.empty}>Nothing is waiting yet. Add a signal above or let the next scheduled run refill the desk.</p>}
        </div>
      </section>

      <section className={styles.sources} aria-labelledby="sources-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Your watchlist</p><h2 id="sources-heading">Sources</h2></div><span>Activate a feed when you trust it</span></div>
          <div className={styles.sourceList}>{data.sources.map((source) => (
            <article key={source.id} className={styles.sourceRow}>
              <span className={styles.health} data-healthy={source.healthy} aria-label={source.healthy ? "Healthy" : "Needs attention"} />
              <div><strong>{source.name}</strong><small>{source.watchlistBeat ?? source.adapterType} · {source.adapterType} · polled {time(source.lastPolledAt)}</small>{source.adapterType === "trend" && <small>Waiting for official API access</small>}</div>
              <span>{source.failureCount} failures</span>
              {toggleSourceAction && <form action={toggleSourceAction}><input type="hidden" name="sourceId" value={source.id} /><input type="hidden" name="active" value={source.active ? "false" : "true"} /><button type="submit">{source.active ? "Pause" : "Activate"}</button></form>}
            </article>
          ))}</div>
          {createSourceAction && <form className={styles.manualForm} action={createSourceAction} aria-label="Add a source definition">
            <label>Source name<input name="name" required /></label>
            <div><label>Beat<select name="watchlistBeat" defaultValue="f1"><option value="f1">F1</option><option value="books">Books</option><option value="music">Music</option><option value="tech-gaming">Tech + gaming</option></select></label><label>Adapter<select name="adapterType"><option value="rss">RSS / Atom</option><option value="youtube">YouTube</option></select></label><label>Trust<select name="trustTier"><option value="publication">Publication</option><option value="primary">Primary</option><option value="community">Community</option><option value="watchlist">Watchlist</option></select></label></div>
            <label>Public feed URL, channel ID, or search query<input name="locator" required /></label>
            <div><label>Locale<input name="locale" defaultValue="en-IN" required /></label><label>Region<input name="region" defaultValue="india" required /></label></div>
            <label><input name="allowlisted" type="checkbox" /> Allow for brief corroboration</label>
            <button type="submit">Add paused source</button>
          </form>}
      </section>
    </main>
  );
}
