import type { DiscoveryTopic, Niche, SourceSignal } from "@/domain/discovery/types";

export type DiscoveryCardKind =
  | "lead"
  | "trend"
  | "meme"
  | "drop"
  | "debate"
  | "visual"
  | "place"
  | "lore"
  | "compact";

export type DiscoveryCardDensity = "feature" | "standard" | "compact";

export interface SignalCue {
  status: string;
  sourceLabels: string[];
  sourceCount: number;
  crossCommunity: boolean;
}

export interface CuriosityAction {
  label: "WTF is this?" | "Why do people care?" | "Explain the lore" | "Go deeper";
  href: string;
}

const sourceLabels: Record<SourceSignal["sourceType"], string> = {
  reddit: "Reddit ↑",
  youtube: "YouTube ↑",
  rss: "RSS signal",
  blog: "Blog signal",
  publication: "Publication signal",
  trend: "Search rising",
  instagram: "Instagram signal",
  tiktok: "TikTok signal",
  manual: "Curated signal",
  web: "Web signal",
};

export function selectCardKind(
  topic: DiscoveryTopic,
  niche: Niche,
  options: { lead?: boolean; compact?: boolean } = {},
): DiscoveryCardKind {
  if (options.lead) return "lead";
  if (options.compact) return "compact";
  if (topic.mode === "deep-lore" || topic.type === "LORE" || topic.type === "RABBIT_HOLE") return "lore";
  if (topic.type === "MEME") return "meme";
  if (["DROP", "PRODUCT", "COMEBACK"].includes(topic.type)) return "drop";
  if (topic.type === "DEBATE" || topic.type === "DRAMA") return "debate";
  if (topic.type === "AESTHETIC") return "visual";
  if (niche.parentCategory === "Food" && topic.type === "TREND") return "place";
  return "trend";
}

export function buildSignalCue(topic: DiscoveryTopic, signals: SourceSignal[]): SignalCue {
  const uniqueTypes = [...new Set(signals.map((signal) => signal.sourceType))];
  const status = topic.signals.momentum >= 85
    ? "Spiking"
    : topic.signals.momentum >= 75
      ? "Rising"
      : topic.freshnessLabel;

  return {
    status,
    sourceLabels: uniqueTypes.filter((type) => type !== "trend").slice(0, 2).map((type) => sourceLabels[type]),
    sourceCount: signals.length,
    crossCommunity: uniqueTypes.length >= 3 || uniqueTypes.includes("trend"),
  };
}

export function getCuriosityAction(topic: DiscoveryTopic): CuriosityAction {
  const base = `/discover/${topic.slug}`;
  if (topic.type === "MEME") return { label: "WTF is this?", href: `${base}#beginner-context` };
  if (topic.type === "DEBATE" || topic.type === "DRAMA") return { label: "Why do people care?", href: `${base}#why-it-matters` };
  if (topic.mode === "deep-lore" || topic.type === "LORE" || topic.type === "RABBIT_HOLE") {
    return { label: "Explain the lore", href: `${base}#lore` };
  }
  return { label: "Go deeper", href: base };
}
