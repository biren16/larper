import Link from "next/link";
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
    <Link href="/studio">Back to Studio</Link>
    <h1>Seven starter drafts</h1>
    <p>Researched on 2 October 2026. Open the receipts before preparing a private draft. Publication needs a fresh founder review and an approved cover.</p>
    <StatusNotice error={query.error} />
    {SEVEN_LANE_STARTERS.map((starter) => {
      const saved = existing.data.find((row) => row.starter_key === starter.key);
      return <section key={starter.key} className={styles.recent}>
        <h2>{starter.draft.title}</h2><p>{starter.draft.hook}</p>
        <p>{starter.originAssessment}</p>
        <ul>{starter.receipts.map((receipt) => <li key={receipt.url}>
          <a href={receipt.url} target="_blank" rel="noreferrer">{receipt.title}</a>
          <p>{receipt.author} · {receipt.publishedAt.slice(0, 10)}. {receipt.assessment}</p>
        </li>)}</ul>
        {saved?.cluster_id ? <Link href={`/studio/candidates/${saved.cluster_id}`}>Open saved draft ({saved.lifecycle})</Link> : <form action={prepareStarterDraftAction}>
          <input type="hidden" name="starterKey" value={starter.key} />
          <label><input name="receiptsChecked" type="checkbox" required /> I opened both receipts and checked their availability and attribution.</label>
          <PendingButton type="submit" pendingLabel="Preparing…">Prepare private draft</PendingButton>
        </form>}
      </section>;
    })}
  </main>;
}
