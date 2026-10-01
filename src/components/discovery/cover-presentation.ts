export interface CoverContext {
  title: string;
  niche: string;
  nicheId: string;
  type: string;
  seed: string;
}

export function coverContextForTopic(item: {
  topic: { id: string; title: string; type: string };
  niche: { id: string; name: string };
}): CoverContext {
  return { title: item.topic.title, niche: item.niche.name, nicheId: item.niche.id, type: item.topic.type, seed: item.topic.id };
}

export type CoverTreatment = "motorsport" | "music" | "screen" | "culture";

export function coverPresentation(context: CoverContext) {
  const treatment: CoverTreatment = context.nicheId === "f1" ? "motorsport"
    : context.nicheId === "music" ? "music"
    : context.nicheId === "screen-culture" ? "screen"
    : "culture";
  let hash = 0;
  for (const character of context.seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return {
    treatment,
    title: context.title,
    label: `${context.niche} / ${context.type}`,
    serial: String(hash % 100).padStart(2, "0"),
  };
}
