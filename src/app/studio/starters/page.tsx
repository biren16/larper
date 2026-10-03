import Link from "next/link";
import { CULTURE_BEATS } from "@/backend/ingestion/source-catalog";
import { SEVEN_LANE_STARTERS } from "@/backend/editorial/starters";
import { authorizedStudioRuntime } from "../runtime";
import { prepareStarterDraftAction } from "../actions";
import { PendingButton } from "../pending-button";
import { StatusNotice } from "../status-notice";
import styles from "../studio.module.css";

export default async function StartersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const runtime = await authorizedStudioRuntime("/studio/starters");
  const query = await searchParams;
  const existing = await runtime.client.from("stories").select("starter_key,slug,cluster_id,lifecycle").in("starter_key", SEVEN_LANE_STARTERS.map((item) => item.key));
  if (existing.error) throw new Error("Could not load starter drafts");
  return <main id="main-content" className={styles.main}>
    <Link className={styles.reviewLink} href="/studio">← Back to Studio</Link>
    <header className={styles.header}><div><p className={styles.kicker}>Editorial starting points</p><h1>Seven starter drafts</h1></div></header>
    <p className={styles.starterIntro}>Start with one niche. Open its two sources, check the claims, then prepare a private draft. Add or select a cover in the editor and review before publishing.</p>
    <p className={styles.meta}>Research checked on 2 October 2026 · Preparing a draft does not publish it</p>
    <StatusNotice error={query.error} />
    {SEVEN_LANE_STARTERS.map((starter) => {
      const saved = existing.data.find((row) => row.starter_key === starter.key);
      return <section key={starter.key} className={styles.starterCard}>
        <p className={styles.kicker}>{CULTURE_BEATS.find((beat) => beat.id === starter.key || (beat.id === "tech-gaming" && starter.key === "gaming-tech"))?.label ?? starter.key}</p>
        <h2>{starter.draft.title}</h2><p className={styles.starterHook}>{starter.draft.hook}</p>
        <p>{starter.originAssessment}</p>
        <ul className={styles.receipts}>{starter.receipts.map((receipt) => <li key={receipt.url}>
          <a href={receipt.url} target="_blank" rel="noreferrer">{receipt.title}</a>
          <p>{receipt.author} · {receipt.publishedAt.slice(0, 10)}. {receipt.assessment}</p>
        </li>)}</ul>
        {saved?.cluster_id ? <Link href={`/studio/candidates/${saved.cluster_id}`} className={styles.starterButton}>{saved.lifecycle.startsWith("published") ? "Edit published story" : "Continue saved draft"}</Link> : <form className={styles.starterForm} action={prepareStarterDraftAction}>
          <input type="hidden" name="starterKey" value={starter.key} />
          <label><input name="receiptsChecked" type="checkbox" required /> I opened both receipts and checked their availability and attribution.</label>
          <PendingButton className={styles.starterButton} type="submit" pendingLabel="Preparing…">Prepare private draft</PendingButton>
        </form>}
      </section>;
    })}
  </main>;
}
