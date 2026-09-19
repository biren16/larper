import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { TopicViewModel } from "@/domain/discovery/services";
import { Artwork } from "./artwork";
import {
  buildSignalCue,
  getCuriosityAction,
  type DiscoveryCardKind,
} from "./topic-presentation";
import styles from "./discovery-card.module.css";

export function DiscoveryCard({
  item,
  kind,
  priority = false,
}: {
  item: TopicViewModel;
  kind: DiscoveryCardKind;
  priority?: boolean;
}) {
  const cue = buildSignalCue(item.topic, item.sources);
  const action = getCuriosityAction(item.topic);
  const showMedia = ["lead", "meme", "drop", "visual", "place", "lore"].includes(kind);
  const showHook = !["meme", "compact"].includes(kind);

  return (
    <article className={`${styles.card} ${styles[kind]}`} data-card-kind={kind}>
      {showMedia && (
        <Link
          className={styles.media}
          href={`/discover/${item.topic.slug}`}
          aria-label={`Open ${item.topic.title}`}
        >
          <Artwork media={item.media} priority={priority} />
        </Link>
      )}
      <div className={styles.copy}>
        <div className={styles.meta}>
          <Link href={`/niches/${item.niche.slug}`}>{item.niche.name}</Link>
          <span>{cue.status}</span>
        </div>
        <h3><Link href={`/discover/${item.topic.slug}`}>{item.topic.title}</Link></h3>
        {showHook && <p className={styles.hook}>{item.topic.hook}</p>}
        <div className={styles.footer}>
          <div className={styles.signals} aria-label={`${item.sourceCount} source signals`}>
            <span>{item.sourceCount} signals</span>
            {cue.sourceLabels.map((label) => <span key={label}>{label}</span>)}
            {cue.crossCommunity && <span>Cross-community</span>}
          </div>
          <Link className={styles.action} href={action.href}>
            {action.label}<ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
