"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import type { DiscoveryHomeViewModel, TopicViewModel } from "@/domain/discovery/services";
import { rankCurrentTopics } from "@/domain/discovery/ranking";
import { useFollowedNiches } from "@/components/preferences/followed-niches-provider";
import { FollowButton } from "@/components/preferences/follow-button";
import { Artwork } from "./artwork";
import { DiscoveryIntro } from "./discovery-intro";
import { buildSignalCue, getCuriosityAction } from "./topic-presentation";
import styles from "./discovery-home.module.css";

type HomeSignalLayout = "lead" | "spotlight" | "strip" | "lore";

function rerank(items: TopicViewModel[], followedNicheIds: string[]): TopicViewModel[] {
  const byId = new Map(items.map((item) => [item.topic.id, item]));
  return rankCurrentTopics(items.map((item) => item.topic), items.flatMap((item) => item.sources), new Set(followedNicheIds))
    .map((item) => ({ ...byId.get(item.topic.id)!, score: item.score, sourceCount: item.sourceCount }));
}

function HomeSignalCard({ item, layout }: { item: TopicViewModel; layout: HomeSignalLayout }) {
  const cue = buildSignalCue(item.topic, item.sources);
  const action = getCuriosityAction(item.topic);
  return (
    <article className={`${styles.signalCard} ${styles[layout]}`}>
      {layout !== "strip" && <Link className={styles.signalMedia} href={`/discover/${item.topic.slug}`} aria-label={`Open ${item.topic.title}`}><Artwork media={item.media} priority={layout === "lead"} /></Link>}
      <div className={styles.signalCopy}>
        <div className={styles.signalMeta}><Link href={`/niches/${item.niche.slug}`}>{item.niche.name}</Link><span>{cue.status}</span><span>{item.sourceCount} signals</span></div>
        <h3><Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link></h3>
        {layout !== "strip" && <p>{item.topic.hook}</p>}
        <Link className={styles.signalAction} href={action.href}>{action.label}<ArrowUpRight aria-hidden /></Link>
      </div>
    </article>
  );
}

export function DiscoveryHome({ home }: { home: DiscoveryHomeViewModel }) {
  const { followedNicheIds } = useFollowedNiches();
  const currentTopics = rerank(home.currentTopics, followedNicheIds);
  const followed = followedNicheIds.map((id) => home.niches.find((niche) => niche.id === id)).filter((niche): niche is DiscoveryHomeViewModel["niches"][number] => Boolean(niche));
  const recommended = home.niches.filter((niche) => !followedNicheIds.includes(niche.id));

  return (
    <main id="main-content" className={styles.main}>
      <DiscoveryIntro items={currentTopics.slice(0, 3)} />
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <p className={styles.kicker}>Find new shit to get obsessed with.</p>
          <h1>Wanna larp bout smth ? Find a niche rn.</h1>
          <p className={styles.dek}>Niche obsessions, drops, memes, debates and lore. Before they hit your whole feed.</p>
          <a className={styles.nowLink} href="#larping-now">See what&apos;s peaking <ArrowDown aria-hidden /></a>
        </div>
        <div className={styles.heroCollage} aria-label="Current ranked culture signals">
          {currentTopics.slice(0, 3).map((item, index) => <Link className={`${styles.heroSignal} ${index === 0 ? styles.heroPrimary : index === 1 ? styles.heroSecondary : styles.heroTertiary}`} href={`/discover/${item.topic.slug}`} aria-label={`Open ${item.topic.title}`} key={item.topic.id}><Artwork media={item.media} priority={index === 0} /><span className={styles.heroCaption}><small>{item.niche.name} / {item.topic.freshnessLabel}</small><strong>{item.topic.title}</strong></span></Link>)}
        </div>
      </header>

      <section className={styles.now} aria-labelledby="larping-now">
        <div className={styles.chapterHeading}><div><span className={styles.liveMark}>Active signals</span><h2 id="larping-now">Larping RN</h2></div><p>The drops, memes and micro-drama moving fastest through niche communities.</p></div>
        <div className={styles.currentScene}>
          <div className={styles.leadStage}><HomeSignalCard item={currentTopics[0]} layout="lead" /></div>
          <div className={styles.spotlightStack}>{currentTopics.slice(1, 5).map((item) => <HomeSignalCard key={item.topic.id} item={item} layout="spotlight" />)}</div>
        </div>
        <div className={styles.signalStrips}>{currentTopics.slice(5, 7).map((item) => <HomeSignalCard key={item.topic.id} item={item} layout="strip" />)}</div>
      </section>

      <section className={styles.yours} aria-labelledby="your-larps">
        <div className={styles.stickyHeading}><span>Your active worlds</span><h2 id="your-larps">Your Larps</h2><p>The niche tabs you never really close.</p></div>
        <div className={styles.nicheRail}>{followed.map((niche) => {
          const latest = currentTopics.find((item) => item.niche.id === niche.id) ?? home.deepLore.find((item) => item.niche.id === niche.id);
          const cue = latest ? buildSignalCue(latest.topic, latest.sources) : null;
          return <article className={styles.followedNiche} key={niche.id}><Link className={styles.nicheMedia} href={`/niches/${niche.slug}`} aria-label={`Open ${niche.name}`}><Artwork media={latest?.media ?? null} /></Link><div className={styles.nicheCopy}><div><span>{cue?.status ?? "Lore open"}</span><span>{latest ? `${latest.sourceCount} signals` : "Start here"}</span></div><h3><Link href={`/niches/${niche.slug}`}>{niche.name}</Link></h3><p>{latest?.topic.title ?? niche.curiosityHook}</p><Link className={styles.roundLink} href={`/niches/${niche.slug}`} aria-label={`Explore ${niche.name}`}><ArrowUpRight aria-hidden /></Link></div></article>;
        })}</div>
      </section>

      <section className={styles.newNiches} aria-labelledby="new-larps">
        <div className={styles.chapterHeading}><div><span>Pick a new rabbit hole</span><h2 id="new-larps">Go larp something new</h2></div><p>One weirdly specific reason to care. No category-directory energy.</p></div>
        <div className={styles.curiosityGrid}>{recommended.slice(0, 5).map((niche, index) => {
          const visual = currentTopics.find((item) => item.niche.id === niche.id) ?? home.deepLore.find((item) => item.niche.id === niche.id);
          return <article className={`${styles.curiosity} ${index > 2 ? styles.curiositySupport : ""}`} key={niche.id}><Link className={styles.curiosityMedia} href={`/niches/${niche.slug}`} aria-label={`Open ${niche.name}`}><Artwork media={visual?.media ?? null} /></Link><div className={styles.curiosityCopy}><span>{niche.parentCategory}</span><h3><Link href={`/niches/${niche.slug}`}>{niche.name}</Link></h3><p>{niche.curiosityHook}</p><FollowButton nicheId={niche.id} nicheName={niche.name} compact /></div></article>;
        })}</div>
      </section>

      <section className={styles.deepLore} aria-labelledby="deep-lore">
        <div className={styles.loreIntro}><span>Context before confidence</span><h2 id="deep-lore">Missed the origin story?</h2><p>Start here. Then go back to the discourse knowing why everyone is yelling.</p><Link className={styles.moreLore} href={`/discover/${home.deepLore[3]?.topic.slug ?? home.deepLore[0].topic.slug}`}>One more rabbit hole <ArrowRight aria-hidden /></Link></div>
        <div className={styles.loreStack}>{home.deepLore.slice(0, 3).map((item) => <HomeSignalCard key={item.topic.id} item={item} layout="lore" />)}</div>
      </section>
    </main>
  );
}
