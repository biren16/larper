import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import type { TopicViewModel } from "@/domain/discovery/services";
import { Artwork } from "./artwork";
import {
  buildSignalCue,
  getCuriosityAction,
  type DiscoveryCardDensity,
  type DiscoveryCardKind,
} from "./topic-presentation";
import styles from "./discovery-card.module.css";

export function DiscoveryCard({
  item,
  kind,
  density = "standard",
  priority = false,
}: {
  item: TopicViewModel;
  kind: DiscoveryCardKind;
  density?: DiscoveryCardDensity;
  priority?: boolean;
}) {
  const cue = buildSignalCue(item.topic, item.sources);
  const action = getCuriosityAction(item.topic);
  const showMedia = density !== "compact" && ["lead", "meme", "drop", "visual", "place", "lore"].includes(kind);
  const showHook = !["meme", "compact"].includes(kind);

  return (
    <article className={`${styles.card} ${styles[kind]}`} data-card-kind={kind} data-density={density}>
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
            {density !== "compact" && cue.sourceLabels.map((label) => <span key={label}>{label}</span>)}
            {density !== "compact" && cue.crossCommunity && <span>Cross-community</span>}
          </div>
          <Link className={styles.action} href={action.href}>
            {action.label}<ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
