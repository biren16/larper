import Image from "next/image";
import type { MediaAsset } from "@/domain/discovery/types";
import { coverPresentation, type CoverContext } from "./cover-presentation";
import styles from "./artwork.module.css";

export function Artwork({ media, context, priority = false, className = "" }: { media: MediaAsset | null; context?: CoverContext; priority?: boolean; className?: string }) {
  if (!media) {
    const cover = context ? coverPresentation(context) : null;
    return <div className={`${styles.fallback} ${className}`} data-testid="larper-cover" data-treatment={cover?.treatment ?? "culture"} aria-hidden>
      <div className={styles.coverTop}><span>larper</span><span>field notes / № {cover?.serial ?? "00"}</span></div>
      <div className={styles.coverMark} aria-hidden>{cover?.treatment === "motorsport" ? "↗" : cover?.treatment === "music" ? "◉" : cover?.treatment === "screen" ? "▣" : "✳"}</div>
      <div className={styles.coverCopy}><span>{cover?.label ?? "CULTURE / LORE"}</span><strong>{cover?.title ?? "Find your next obsession"}</strong></div>
    </div>;
  }

  return (
    <div className={`${styles.frame} ${className}`} data-testid="media-frame" data-modification={media.modificationAllowed === false ? "restricted" : "allowed"}>
      <Artwork media={null} context={context} className={styles.underlay} />
      <Image
        src={media.src}
        alt={media.alt}
        fill
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        sizes="(max-width: 767px) 100vw, (max-width: 1100px) 60vw, 50vw"
        style={{ objectPosition: media.focalPosition ?? "50% 50%" }}
        unoptimized={media.src.startsWith("https://")}
      />
      {media.kind === "uploaded" && media.creditLine ? <span className={styles.credit}>{media.creditLine}</span> : null}
    </div>
  );
}
