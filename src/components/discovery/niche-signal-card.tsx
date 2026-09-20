import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { TopicViewModel } from "@/domain/discovery/services";

import { Artwork } from "./artwork";
import { buildSignalCue, getCuriosityAction } from "./topic-presentation";
import styles from "./niche-signal-card.module.css";

export type NicheSignalLayout = "lead" | "feed" | "lore";

export function NicheSignalCard({
  item,
  layout,
  priority = false,
}: {
  item: TopicViewModel;
  layout: NicheSignalLayout;
  priority?: boolean;
}) {
  const cue = buildSignalCue(item.topic, item.sources);
  const action = getCuriosityAction(item.topic);

  return (
    <article className={`${styles.card} ${styles[layout]}`} data-niche-layout={layout}>
      <Link
        className={styles.media}
        href={`/discover/${item.topic.slug}`}
        aria-label={`Open ${item.topic.title}`}
      >
        <Artwork media={item.media} priority={priority} />
      </Link>
      <div className={styles.copy}>
        <div className={styles.meta}>
          <span className={styles.status}>{cue.status}</span>
          <span>{item.sourceCount} signals</span>
          {cue.crossCommunity && <span>Cross-community</span>}
        </div>
        <h3>
          <Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link>
        </h3>
        <p className={styles.hook}>{item.topic.hook}</p>
        <div className={styles.footer}>
          <div className={styles.sources} aria-label={`${item.sourceCount} source signals`}>
            {cue.sourceLabels.map((label) => <span key={label}>{label}</span>)}
          </div>
          <Link className={styles.action} href={action.href}>
            {action.label}<ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
