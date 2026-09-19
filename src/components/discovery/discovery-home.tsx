"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import type { DiscoveryHomeViewModel, TopicViewModel } from "@/domain/discovery/services";
import { rankCurrentTopics } from "@/domain/discovery/ranking";
import { useFollowedNiches } from "@/components/preferences/followed-niches-provider";
import { FollowButton } from "@/components/preferences/follow-button";
import { LeadTopic, LoreTile, TopicRow } from "./topic-pieces";
import styles from "./discovery-home.module.css";

function rerank(items: TopicViewModel[], followedNicheIds: string[]): TopicViewModel[] {
  const byId = new Map(items.map((item) => [item.topic.id, item]));
  return rankCurrentTopics(
    items.map((item) => item.topic),
    items.flatMap((item) => item.sources),
    new Set(followedNicheIds),
  ).map((item) => ({ ...byId.get(item.topic.id)!, score: item.score, sourceCount: item.sourceCount }));
}

export function DiscoveryHome({ home }: { home: DiscoveryHomeViewModel }) {
  const { followedNicheIds } = useFollowedNiches();
  const currentTopics = rerank(home.currentTopics, followedNicheIds);
  const followed = followedNicheIds
    .map((id) => home.niches.find((niche) => niche.id === id))
    .filter((niche): niche is DiscoveryHomeViewModel["niches"][number] => Boolean(niche));
  const recommended = home.niches.filter((niche) => !followedNicheIds.includes(niche.id));
  const lead = currentTopics[0];

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Find new shit to get obsessed with.</p>
        <h1>What niche communities are obsessed with right now.</h1>
        <p className={styles.dek}>Open the story, get the context, then follow the rabbit hole.</p>
      </header>

      <section className={styles.now} aria-labelledby="larping-now">
        <div className={styles.sectionTitle}>
          <h2 id="larping-now">Larping RN</h2>
          <p>Authored demo signals moving through niche communities, ranked by heat and freshness.</p>
        </div>
        {lead && <LeadTopic item={lead} />}
        <div className={styles.storyList}>
          {currentTopics.slice(1, 6).map((item, index) => <TopicRow key={item.topic.id} item={item} index={index + 1} />)}
        </div>
      </section>

      <section className={styles.yours} aria-labelledby="your-larps">
        <div className={styles.sectionTitle}>
          <h2 id="your-larps">Your Larps</h2>
          <p>The corners of the internet you asked us to keep warm.</p>
        </div>
        <div className={styles.nicheRail}>
          {followed.map((niche) => {
            const latest = currentTopics.find((item) => item.niche.id === niche.id);
            return (
              <article className={styles.followedNiche} key={niche.id}>
                <div>
                  <Link href={`/niches/${niche.slug}`}><h3>{niche.name}</h3></Link>
                  <p>{latest ? latest.topic.freshnessLabel : "Nothing urgent. Deep lore still open."}</p>
                </div>
                <Link className={styles.textLink} href={`/niches/${niche.slug}`} aria-label={`Explore ${niche.name}`}><ArrowRight aria-hidden /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.newNiches} aria-labelledby="new-larps">
        <div className={styles.sectionTitle}>
          <h2 id="new-larps">Go larp something new</h2>
          <p>No category counts. Just a reason to get curious.</p>
        </div>
        <div className={styles.curiosityGrid}>
          {recommended.slice(0, 5).map((niche, index) => (
            <article className={styles.curiosity} key={niche.id}>
              <span className={styles.curiosityIndex}>{String(index + 1).padStart(2, "0")}</span>
              <h3><Link href={`/niches/${niche.slug}`}>{niche.name}</Link></h3>
              <p>{niche.curiosityHook}</p>
              <FollowButton nicheId={niche.id} nicheName={niche.name} compact />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.deepLore} aria-labelledby="deep-lore">
        <div className={styles.sectionTitle}>
          <h2 id="deep-lore">Deep lore</h2>
          <p>Not breaking. Still worth losing an afternoon to.</p>
        </div>
        <div className={styles.loreGrid}>
          {home.deepLore.slice(0, 4).map((item) => <LoreTile key={item.topic.id} item={item} />)}
        </div>
        <Link className={styles.moreLore} href={`/discover/${home.deepLore[4]?.topic.slug ?? home.deepLore[0].topic.slug}`}>
          One more rabbit hole <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
