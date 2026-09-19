import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "@/components/discovery/artwork";
import { TopicRow } from "@/components/discovery/topic-pieces";
import { seedRepository } from "@/data/seed/repository";
import { buildTopicDetail } from "@/domain/discovery/services";
import styles from "./page.module.css";

export async function generateStaticParams() {
  const topics = await seedRepository.listTopics();
  return topics.filter((topic) => topic.status === "published").map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await buildTopicDetail(seedRepository, slug);
  if (!detail) return { title: "Rabbit hole not found" };
  return { title: detail.topic.title, description: detail.topic.hook };
}

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await buildTopicDetail(seedRepository, slug);
  if (!detail) notFound();

  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.backRow}>
        <Link href="/"><ArrowLeft aria-hidden /> Discovery</Link>
        <span>{detail.topic.type.replace("_", " ")}</span>
      </div>

      <header className={styles.hero}>
        <div className={styles.titleBlock}>
          <Link className={styles.nicheLink} href={`/niches/${detail.niche.slug}`}>{detail.niche.name}</Link>
          <h1>{detail.topic.title}</h1>
          <p>{detail.topic.hook}</p>
          <div className={styles.signals}><span>{detail.topic.freshnessLabel}</span><span>{detail.sourceCount} source signals</span></div>
        </div>
        <Artwork media={detail.media} priority className={styles.heroArt} />
      </header>

      <article className={styles.story}>
        <section>
          <h2>What happened?</h2>
          <p>{detail.topic.summary}</p>
        </section>
        <section>
          <h2>Why people care</h2>
          <p>{detail.topic.whyItMatters}</p>
        </section>
        <section className={styles.loreSection}>
          <h2>The lore</h2>
          <p>{detail.topic.lore}</p>
        </section>
        <aside>
          <h2>If you’re new</h2>
          <p>{detail.topic.beginnerContext}</p>
        </aside>
      </article>

      <section className={styles.sources} aria-labelledby="sources-heading">
        <h2 id="sources-heading">Source signals</h2>
        <p className={styles.sourceNote}>Seed provenance for this development story. Fictional records are never linked as real reporting.</p>
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
        <div>{detail.relatedTopics.map((item) => <TopicRow key={item.topic.id} item={item} />)}</div>
      </section>
    </main>
  );
}

