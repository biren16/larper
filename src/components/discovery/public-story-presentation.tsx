import Link from "next/link";
import type { ReactNode } from "react";
import type { TopicDetailViewModel } from "@/domain/discovery/services";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "./artwork";
import { coverContextForTopic } from "./cover-presentation";
import { DiscoveryCard } from "./discovery-card";
import { buildEvidenceProvenance, buildSignalCue, selectCardKind } from "./topic-presentation";
import styles from "@/app/discover/[slug]/page.module.css";

// One presentation for public readers and private previews. Request/account state is supplied by the caller.
export function PublicStoryPresentation({detail, beacon, saveControl}: { detail: TopicDetailViewModel; beacon?: ReactNode; saveControl?: ReactNode }) {
  const cue = buildSignalCue(detail.topic, detail.sources);
  const provenance = buildEvidenceProvenance(detail.topic, detail.sources);

  return (
    <main id="main-content" className={styles.main}>
      {beacon}
      <div className={styles.backRow}>
        <Link href="/"><ArrowLeft aria-hidden /> Discovery</Link>
        <span>{detail.topic.type.replace("_", " ")}</span>
      </div>

      <header className={styles.hero}>
        <div className={styles.titleBlock}>
          <Link className={styles.nicheLink} href={`/niches/${detail.niche.slug}`}>{detail.niche.name}</Link>
          <h1>{detail.topic.title}</h1>
          <p>{detail.topic.hook}</p>
          <div className={styles.signals}>
            <span>{cue.status}</span><span>{provenance.sourceCountLabel}</span>
            {cue.sourceLabels.map((label) => <span key={label}>{label}</span>)}
          </div>
          {saveControl}
        </div>
        <Artwork media={detail.media} context={coverContextForTopic(detail)} priority className={styles.heroArt} />
      </header>

      <article className={styles.story}>
        <section id="what-happened">
          <h2>What happened?</h2>
          <p>{detail.topic.summary}</p>
        </section>
        <section id="why-it-matters">
          <h2>Why people care</h2>
          <p>{detail.topic.whyItMatters}</p>
        </section>
        <section id="lore" className={styles.loreSection}>
          <h2>The lore</h2>
          <p>{detail.topic.lore}</p>
        </section>
        <aside id="beginner-context">
          <h2>If you’re new</h2>
          <p>{detail.topic.beginnerContext}</p>
        </aside>
      </article>

      <section className={styles.sources} aria-labelledby="sources-heading">
        <h2 id="sources-heading">Source signals</h2>
        <p className={styles.sourceNote}>{provenance.note}</p>
        <p>{provenance.summary}</p>
        <div className={styles.sourceGrid}>
          {detail.sources.map((source) => {
            const content = <><span>{source.sourceType}</span><h3>{source.sourceName}</h3><p>{source.title}</p></>;
            return source.sourceUrl ? (
              <a key={source.id} href={source.sourceUrl} target="_blank" rel="noreferrer">{content}<ArrowUpRight aria-hidden /></a>
            ) : <article key={source.id}>{content}</article>;
          })}
        </div>
      </section>

      <section className={styles.related} aria-labelledby="related-heading">
        <h2 id="related-heading">Keep going</h2>
        <div>{detail.relatedTopics.map((item) => (
          <DiscoveryCard key={item.topic.id} item={item} kind={selectCardKind(item.topic, item.niche, { compact: true })} />
        ))}</div>
      </section>
    </main>
  );
}
