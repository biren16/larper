import Link from "next/link";
import styles from "./studio.module.css";

export interface StudioDashboardData {
  candidates: Array<{ id: string; title: string; nicheName: string; heat: number; confidence: number; state: string; sourceCount: number; lastCheckedAt: string; sensitiveFlags: string[] }>;
  sources: Array<{ id: string; name: string; adapterType: string; healthy: boolean; lastPolledAt: string | null; failureCount: number }>;
  runs: Array<{ id: string; status: string; startedAt: string; insertedCount: number; errorCount: number }>;
}

const time = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Never";

export function StudioDashboard({ data, manualSignalAction }: { data: StudioDashboardData; manualSignalAction?: (form: FormData) => void | Promise<void> }) {
  const latestRun = data.runs[0];
  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Founder workspace</p><h1>Editorial radar</h1><p>Verify the signal. Shape the story. Keep the receipts.</p></div>
        <div className={styles.runStatus} data-status={latestRun?.status ?? "idle"}>
          <span>Pipeline</span>
          <strong>{latestRun ? `Last run ${latestRun.status}` : "No runs yet"}</strong>
          {latestRun && <small>{time(latestRun.startedAt)} · {latestRun.insertedCount} new · {latestRun.errorCount} errors</small>}
        </div>
      </header>

      <section className={styles.queue} aria-labelledby="queue-heading">
        <div className={styles.sectionHeading}><div><p>Ranked by evidence</p><h2 id="queue-heading">Review queue</h2></div><span>{data.candidates.length} candidates</span></div>
        <div className={styles.candidateGrid}>
          {data.candidates.map((candidate) => (
            <article className={styles.candidate} key={candidate.id}>
              <div className={styles.metrics}><strong>{candidate.heat} heat</strong><span>{candidate.confidence} confidence</span><span>{candidate.sourceCount} sources</span></div>
              <p className={styles.niche}>{candidate.nicheName} · {candidate.state.replaceAll("_", " ")}</p>
              <h3>{candidate.title}</h3>
              <p className={styles.checked}>Checked {time(candidate.lastCheckedAt)}</p>
              {candidate.sensitiveFlags.length > 0 && <p className={styles.warning}>Review required: {candidate.sensitiveFlags.join(", ")}</p>}
              <Link className={styles.reviewLink} href={`/studio/candidates/${candidate.id}`}>Review evidence</Link>
            </article>
          ))}
          {data.candidates.length === 0 && <p className={styles.empty}>Nothing is waiting. The radar will refill after the next ingestion run.</p>}
        </div>
      </section>

      <div className={styles.lowerGrid}>
        <section aria-labelledby="sources-heading">
          <div className={styles.sectionHeading}><div><p>Adapter health</p><h2 id="sources-heading">Sources</h2></div></div>
          <div className={styles.sourceList}>{data.sources.map((source) => (
            <article key={source.id} className={styles.sourceRow}>
              <span className={styles.health} data-healthy={source.healthy} aria-label={source.healthy ? "Healthy" : "Needs attention"} />
              <div><strong>{source.name}</strong><small>{source.adapterType} · polled {time(source.lastPolledAt)}</small></div>
              <span>{source.failureCount} failures</span>
            </article>
          ))}</div>
        </section>

        <section aria-labelledby="manual-heading">
          <div className={styles.sectionHeading}><div><p>Hard-to-access platforms</p><h2 id="manual-heading">Add signal</h2></div></div>
          <form className={styles.manualForm} aria-label="Add a manual signal" action={manualSignalAction}>
            <label>Public URL<input name="url" type="url" required placeholder="https://…" /></label>
            <label>What is moving?<input name="title" required maxLength={180} /></label>
            <div><label>Source name<input name="sourceName" required /></label><label>Region<select name="region" defaultValue="india"><option value="india">India</option><option value="global">Global</option></select></label></div>
            <label>Published at<input name="publishedAt" type="datetime-local" required /></label>
            <button type="submit">Add to evidence inbox</button>
          </form>
        </section>
      </div>
    </main>
  );
}
