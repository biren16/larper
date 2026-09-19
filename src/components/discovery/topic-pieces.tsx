import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { TopicViewModel } from "@/domain/discovery/services";
import { Artwork } from "./artwork";
import styles from "./topic-pieces.module.css";

export function TopicMeta({ item }: { item: TopicViewModel }) {
  return (
    <div className={styles.meta}>
      <Link href={`/niches/${item.niche.slug}`}>{item.niche.name}</Link>
      <span>{item.topic.type.replace("_", " ")}</span>
      <span>{item.topic.freshnessLabel}</span>
    </div>
  );
}

export function LeadTopic({ item }: { item: TopicViewModel }) {
  return (
    <article className={styles.lead}>
      <Link className={styles.leadImage} href={`/discover/${item.topic.slug}`} aria-label={`Read ${item.topic.title}`}>
        <Artwork media={item.media} priority />
      </Link>
      <div className={styles.leadCopy}>
        <TopicMeta item={item} />
        <h3><Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link></h3>
        <p>{item.topic.hook}</p>
        <div className={styles.signalLine}><span>{item.sourceCount} signals</span><span>{Math.round(item.score)} heat</span></div>
      </div>
    </article>
  );
}

export function TopicRow({ item, index }: { item: TopicViewModel; index?: number }) {
  return (
    <article className={`${styles.row} ${typeof index !== "number" ? styles.rowWithoutRank : ""}`}>
      {typeof index === "number" && <span className={styles.rank}>{String(index + 1).padStart(2, "0")}</span>}
      <div className={styles.rowCopy}>
        <TopicMeta item={item} />
        <h3><Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link></h3>
        <p>{item.topic.hook}</p>
      </div>
      <Link className={styles.arrow} href={`/discover/${item.topic.slug}`} aria-label={`Read ${item.topic.title}`}><ArrowUpRight aria-hidden /></Link>
    </article>
  );
}

export function LoreTile({ item }: { item: TopicViewModel }) {
  return (
    <article className={styles.lore}>
      <Link href={`/discover/${item.topic.slug}`} className={styles.loreImage} aria-label={`Explore ${item.topic.title}`}><Artwork media={item.media} /></Link>
      <div>
        <TopicMeta item={item} />
        <h3><Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link></h3>
        <p>{item.topic.beginnerContext}</p>
      </div>
    </article>
  );
}
