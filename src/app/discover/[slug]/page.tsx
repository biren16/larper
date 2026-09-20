import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "@/components/discovery/artwork";
import { InteractionBeacon } from "@/components/accounts/interaction-beacon";
import { SavedStoryControl } from "@/components/accounts/saved-story-control";
import { Suspense } from "react";
import { DiscoveryCard } from "@/components/discovery/discovery-card";
import { buildEvidenceProvenance, buildSignalCue, selectCardKind } from "@/components/discovery/topic-presentation";
import { getCachedTopicDetail } from "@/data/discovery-cache";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  if (!detail) return { title: "Rabbit hole not found" };
  return { title: detail.topic.title, description: detail.topic.hook };
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  if (!detail) notFound();
  const cue = buildSignalCue(detail.topic, detail.sources);
  const provenance = buildEvidenceProvenance(detail.topic, detail.sources);

  return (
    <main id="main-content" className={styles.main}>
      <InteractionBeacon storyId={detail.topic.id} nicheId={detail.niche.id} />
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
          <Suspense fallback={<span>Checking saves…</span>}><SavedStoryControl storyId={detail.topic.id} returnPath={`/discover/${detail.topic.slug}`} /></Suspense>
        </div>
        <Artwork media={detail.media} priority className={styles.heroArt} />
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
