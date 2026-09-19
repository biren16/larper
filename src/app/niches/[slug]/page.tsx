import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "@/components/discovery/artwork";
import { DiscoveryCard } from "@/components/discovery/discovery-card";
import { selectCardKind } from "@/components/discovery/topic-presentation";
import { FollowButton } from "@/components/preferences/follow-button";
import { seedRepository } from "@/data/seed/repository";
import { buildNichePage } from "@/domain/discovery/services";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";
import styles from "./page.module.css";

export async function generateStaticParams() {
  const niches = await seedRepository.listNiches();
  return niches.map((niche) => ({ slug: niche.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = await seedRepository.getNicheBySlug(slug);
  if (!niche) return { title: "Niche not found" };
  return { title: niche.name, description: niche.description };
}

export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await buildNichePage(seedRepository, slug, DEFAULT_FOLLOWED_NICHE_IDS);
  if (!page) notFound();

  return (
    <main id="main-content" className={styles.main}>
      <Link className={styles.back} href="/"><ArrowLeft aria-hidden /> Discovery</Link>
      <header className={styles.hero}>
        <div className={styles.copy}>
          <p>{page.niche.parentCategory}</p>
          <h1>{page.niche.name}</h1>
          <p className={styles.description}>{page.niche.description}</p>
          <FollowButton nicheId={page.niche.id} nicheName={page.niche.name} />
        </div>
        <Artwork media={page.media} priority className={styles.art} />
        <blockquote>{page.niche.curiosityHook}</blockquote>
      </header>

      <section className={styles.current} aria-labelledby="current-heading">
        <div className={styles.heading}>
          <h2 id="current-heading">What’s happening</h2>
          <p>Ranked signals from inside {page.niche.name.toLowerCase()}.</p>
        </div>
        <div className={styles.rows}>{page.currentTopics.map((item, index) => (
          <DiscoveryCard key={item.topic.id} item={item} kind={selectCardKind(item.topic, item.niche, { lead: index === 0 })} priority={index === 0} />
        ))}</div>
      </section>

      {page.deepLore.length > 0 && (
        <section className={styles.lore} aria-labelledby="lore-heading">
          <div className={styles.heading}><h2 id="lore-heading">Learn the lore</h2><p>Start here if you’re new.</p></div>
          <div className={styles.loreGrid}>{page.deepLore.map((item) => <DiscoveryCard key={item.topic.id} item={item} kind="lore" />)}</div>
        </section>
      )}

      <section className={styles.related} aria-labelledby="related-niches">
        <h2 id="related-niches">Adjacent obsessions</h2>
        <div>
          {page.relatedNicheCards.map(({ niche, media }) => (
            <Link key={niche.id} href={`/niches/${niche.slug}`}>
              <Artwork media={media} />
              <span><small>{niche.parentCategory}</small>{niche.name}</span>
              <ArrowRight aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
