import Image from "next/image";
import type { MediaAsset } from "@/domain/discovery/types";
import styles from "./artwork.module.css";

export function Artwork({ media, priority = false, className = "" }: { media: MediaAsset | null; priority?: boolean; className?: string }) {
  if (!media) return <div className={`${styles.fallback} ${className}`} aria-hidden><span>LARPer</span></div>;

  return (
    <div className={`${styles.frame} ${className}`}>
      <Image
        src={media.src}
        alt={media.alt}
        fill
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        sizes="(max-width: 767px) 100vw, (max-width: 1100px) 60vw, 50vw"
        style={{ objectPosition: media.focalPosition ?? "50% 50%" }}
      />
    </div>
  );
}
