import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "@/components/discovery/artwork";
import { NicheSectionNav } from "@/components/discovery/niche-section-nav";
import { NicheSignalCard } from "@/components/discovery/niche-signal-card";
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
      <div className={styles.heroShell}>
        <Link className={styles.back} href="/"><ArrowLeft aria-hidden /> Discovery</Link>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{page.niche.parentCategory} / Niche world</p>
            <h1>{page.niche.name}</h1>
            <p className={styles.description}>{page.niche.description}</p>
            <div className={styles.heroMeta} aria-label="Niche activity">
              <span><strong>{page.currentTopics.length}</strong> current signals</span>
              <span><strong>{page.deepLore.length}</strong> lore stories</span>
            </div>
            <FollowButton nicheId={page.niche.id} nicheName={page.niche.name} />
          </div>
          <div className={styles.heroVisual}>
            <Artwork media={page.media} priority className={styles.art} />
            <blockquote>{page.niche.curiosityHook}</blockquote>
          </div>
        </header>
      </div>

      <NicheSectionNav nicheName={page.niche.name} hasLore={page.deepLore.length > 0} />

      <section id="current" className={styles.current} aria-labelledby="current-heading">
        <div className={styles.chapterHeading}>
          <p>Live inside the niche</p>
          <h2 id="current-heading">What’s happening</h2>
          <span>The signals, arguments and drops moving through {page.niche.name.toLowerCase()} right now.</span>
        </div>
        <div className={styles.currentScene}>
          {page.currentTopics[0] && (
            <div className={styles.leadStage}>
              <NicheSignalCard item={page.currentTopics[0]} layout="lead" priority />
            </div>
          )}
          <div className={styles.feed}>
            {page.currentTopics.slice(1).map((item) => (
              <NicheSignalCard key={item.topic.id} item={item} layout="feed" />
            ))}
          </div>
        </div>
      </section>

      {page.deepLore.length > 0 && (
        <section id="lore" className={styles.lore} aria-labelledby="lore-heading">
          <div className={styles.loreIntro}>
            <p>Context before confidence</p>
            <h2 id="lore-heading">Learn the lore</h2>
            <span>The origin stories worth knowing before you enter the group chat.</span>
          </div>
          <div className={styles.loreStories}>
            {page.deepLore.map((item) => <NicheSignalCard key={item.topic.id} item={item} layout="lore" />)}
          </div>
        </section>
      )}

      <section id="adjacent" className={styles.related} aria-labelledby="related-niches">
        <div className={styles.chapterHeading}>
          <p>Keep wandering</p>
          <h2 id="related-niches">Adjacent obsessions</h2>
          <span>Different worlds. Same specific kind of brain itch.</span>
        </div>
        <div className={styles.relatedRail}>
          {page.relatedNicheCards.map(({ niche, media }) => (
            <Link key={niche.id} href={`/niches/${niche.slug}`}>
              <div className={styles.relatedArt}><Artwork media={media} /></div>
              <span className={styles.relatedCopy}>
                <small>{niche.parentCategory}</small>
                <strong>{niche.name}</strong>
                <em>Enter the niche <ArrowRight aria-hidden /></em>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
