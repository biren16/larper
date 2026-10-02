import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Artwork } from "@/components/discovery/artwork";
import { NicheSectionNav } from "@/components/discovery/niche-section-nav";
import { NicheSignalCard } from "@/components/discovery/niche-signal-card";
import { FollowButton } from "@/components/preferences/follow-button";
import { filterStyleTopics, parseStyleSubtopic } from "@/domain/discovery/style-subtopics";
import { getCachedNichePage } from "@/data/discovery-cache";
import styles from "./page.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCachedNichePage(slug);
  if (!page) return { title: "Niche not found" };
  return { title: page.niche.name, description: page.niche.description };
}

export const instant = false;

export default async function NichePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ subtopic?: string | string[] }> }) {
  const { slug } = await params;
  const cached = await getCachedNichePage(slug);
  if (!cached) notFound();
  const subtopic = slug === "style" ? parseStyleSubtopic((await searchParams)?.subtopic) : null;
  // Filter after loading the cached base page; query variants never share filtered cache entries.
  const page = { ...cached, currentTopics: filterStyleTopics(cached.currentTopics, subtopic), deepLore: filterStyleTopics(cached.deepLore, subtopic) };

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
            <Artwork media={page.media} context={{ title: page.niche.name, niche: page.niche.name, nicheId: page.niche.id, type: "NICHE", seed: page.niche.id }} priority className={styles.art} />
            <blockquote>{page.niche.curiosityHook}</blockquote>
          </div>
        </header>
      </div>

      {slug === "style" && <nav className={styles.subtopics} aria-label="Style subtopics">
        <Link href="/niches/style" aria-current={!subtopic ? "page" : undefined}>All Style</Link>
        <Link href="/niches/style?subtopic=sneakers" aria-current={subtopic === "sneakers" ? "page" : undefined}>Sneakers</Link>
        <Link href="/niches/style?subtopic=streetwear" aria-current={subtopic === "streetwear" ? "page" : undefined}>Streetwear</Link>
      </nav>}
      {subtopic && page.currentTopics.length === 0 && page.deepLore.length === 0 && <p className={styles.empty} role="status">No published {subtopic} stories yet. Explore All Style while this shelf grows.</p>}
      <NicheSectionNav nicheName={page.niche.name} hasLore={page.deepLore.length > 0} />

      <section id="current" className={styles.current} aria-labelledby="current-heading">
        <div className={styles.chapterHeading}>
          <p>Live inside the niche</p>
          <h2 id="current-heading">What’s happening</h2>
          <span>The signals, arguments and drops moving through {page.niche.name.toLowerCase()} right now.</span>
        </div>
        {page.currentTopics.length === 0 && <p className={styles.empty}>No current stories {subtopic ? `for ${subtopic}` : "in this niche"} yet.</p>}
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
              <div className={styles.relatedArt}><Artwork media={media} context={{ title: niche.name, niche: niche.name, nicheId: niche.id, type: "NICHE", seed: niche.id }} /></div>
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
