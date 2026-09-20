"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import type { DiscoveryHomeViewModel, TopicViewModel } from "@/domain/discovery/services";
import { rankCurrentTopics } from "@/domain/discovery/ranking";
import { useFollowedNiches } from "@/components/preferences/followed-niches-provider";
import { FollowButton } from "@/components/preferences/follow-button";
import { Artwork } from "./artwork";
import { DiscoveryCard } from "./discovery-card";
import { buildSignalCue, selectCardKind } from "./topic-presentation";
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

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Find new shit to get obsessed with.</p>
          <h1>What the internet is larping rn.</h1>
          <p className={styles.dek}>Niche obsessions, drops, memes, debates and lore. Before they hit your whole feed.</p>
        </div>
        <div className={styles.introStamp} aria-label="Authored demo signals">
          <span>Demo signals</span>
          <strong>Culture moves sideways.</strong>
          <p>We keep the context attached.</p>
        </div>
      </header>

      <section className={styles.now} aria-labelledby="larping-now">
        <div className={styles.chapterHeading}>
          <div><span className={styles.liveMark}>Active signals</span><h2 id="larping-now">Larping RN</h2></div>
          <p>Authored demo signals, ranked from momentum, freshness and source variety.</p>
        </div>
        <div className={styles.signalGrid}>
          {currentTopics.slice(0, 7).map((item, index) => (
            <DiscoveryCard
              key={item.topic.id}
              item={item}
              kind={selectCardKind(item.topic, item.niche, { lead: index === 0, compact: index === 6 })}
              density={index === 0 ? "feature" : index < 4 ? "compact" : "standard"}
              priority={index === 0}
            />
          ))}
        </div>
      </section>

      <section className={styles.yours} aria-labelledby="your-larps">
        <div className={styles.stickyHeading}>
          <span>Your active worlds</span>
          <h2 id="your-larps">Your Larps</h2>
          <p>The niche tabs you never really close.</p>
        </div>
        <div className={styles.nicheRail}>
          {followed.map((niche) => {
            const latest = currentTopics.find((item) => item.niche.id === niche.id)
              ?? home.deepLore.find((item) => item.niche.id === niche.id);
            const cue = latest ? buildSignalCue(latest.topic, latest.sources) : null;
            return (
              <article className={styles.followedNiche} key={niche.id}>
                <Link className={styles.nicheMedia} href={`/niches/${niche.slug}`} aria-label={`Open ${niche.name}`}>
                  <Artwork media={latest?.media ?? null} />
                </Link>
                <div className={styles.nicheCopy}>
                  <div><span>{cue?.status ?? "Lore open"}</span><span>{latest ? `${latest.sourceCount} signals` : "Start here"}</span></div>
                  <h3><Link href={`/niches/${niche.slug}`}>{niche.name}</Link></h3>
                  <p>{latest?.topic.title ?? niche.curiosityHook}</p>
                  <Link className={styles.roundLink} href={`/niches/${niche.slug}`} aria-label={`Explore ${niche.name}`}><ArrowUpRight aria-hidden /></Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.newNiches} aria-labelledby="new-larps">
        <div className={styles.chapterHeading}>
          <div><span>Pick a new rabbit hole</span><h2 id="new-larps">Go larp something new</h2></div>
          <p>One weirdly specific reason to care. No category-directory energy.</p>
        </div>
        <div className={styles.curiosityGrid}>
          {recommended.slice(0, 5).map((niche, index) => {
            const visual = currentTopics.find((item) => item.niche.id === niche.id)
              ?? home.deepLore.find((item) => item.niche.id === niche.id);
            return (
              <article className={styles.curiosity} key={niche.id}>
                <Link className={styles.curiosityMedia} href={`/niches/${niche.slug}`} aria-label={`Open ${niche.name}`}>
                  <Artwork media={visual?.media ?? null} />
                </Link>
                <div className={styles.curiosityCopy}>
                  <span>{niche.parentCategory}</span>
                  <h3><Link href={`/niches/${niche.slug}`}>{niche.name}</Link></h3>
                  <p>{niche.curiosityHook}</p>
                  <FollowButton nicheId={niche.id} nicheName={niche.name} compact />
                </div>
                {index === 1 && <div className={styles.printField} aria-hidden />}
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.deepLore} aria-labelledby="deep-lore">
        <div className={styles.loreIntro}>
          <span>Context before confidence</span>
          <h2 id="deep-lore">Missed the origin story?</h2>
          <p>Start here. Then go back to the discourse knowing why everyone is yelling.</p>
        </div>
        <div className={styles.loreStack}>
          {home.deepLore.slice(0, 3).map((item) => (
            <div key={item.topic.id}><DiscoveryCard item={item} kind="lore" /></div>
          ))}
        </div>
        <Link className={styles.moreLore} href={`/discover/${home.deepLore[3]?.topic.slug ?? home.deepLore[0].topic.slug}`}>
          One more rabbit hole <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
