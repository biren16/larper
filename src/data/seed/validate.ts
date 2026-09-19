import type { SeedDataset } from "@/domain/discovery/types";

function duplicateMessages(label: string, ids: string[]): string[] {
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicateIds.add(id);
    seen.add(id);
  }
  return [...duplicateIds].map((id) => `Duplicate ${label} id: ${id}`);
}

function validDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function validateSeedDataset(dataset: SeedDataset): string[] {
  const errors: string[] = [];
  const nicheIds = new Set(dataset.niches.map((niche) => niche.id));
  const topicIds = new Set(dataset.topics.map((topic) => topic.id));
  const mediaIds = new Set(dataset.media.map((asset) => asset.id));

  errors.push(...duplicateMessages("niche", dataset.niches.map((niche) => niche.id)));
  errors.push(...duplicateMessages("topic", dataset.topics.map((topic) => topic.id)));
  errors.push(...duplicateMessages("source", dataset.sourceSignals.map((source) => source.id)));
  errors.push(...duplicateMessages("media", dataset.media.map((asset) => asset.id)));

  for (const niche of dataset.niches) {
    for (const relatedId of niche.relatedNicheIds) {
      if (!nicheIds.has(relatedId)) errors.push(`Niche ${niche.id} references missing related niche ${relatedId}`);
    }
    if (niche.heroMediaId && !mediaIds.has(niche.heroMediaId)) {
      errors.push(`Niche ${niche.id} references missing media ${niche.heroMediaId}`);
    }
  }

  for (const topic of dataset.topics) {
    if (!nicheIds.has(topic.nicheId)) errors.push(`Topic ${topic.id} references missing niche ${topic.nicheId}`);
    for (const relatedId of topic.relatedTopicIds) {
      if (!topicIds.has(relatedId)) errors.push(`Topic ${topic.id} references missing related topic ${relatedId}`);
    }
    if (topic.mediaId && !mediaIds.has(topic.mediaId)) {
      errors.push(`Topic ${topic.id} references missing media ${topic.mediaId}`);
    }
    for (const [name, value] of Object.entries(topic.signals)) {
      if (value < 0 || value > 100) errors.push(`Topic ${topic.id} has ${name} outside 0-100`);
    }
    for (const field of ["firstDetectedAt", "lastUpdatedAt", "publishedAt"] as const) {
      if (!validDate(topic[field])) errors.push(`Topic ${topic.id} has invalid ${field}`);
    }
  }

  for (const source of dataset.sourceSignals) {
    if (!topicIds.has(source.topicId)) errors.push(`Source ${source.id} references missing topic ${source.topicId}`);
    if (!validDate(source.publishedAt)) errors.push(`Source ${source.id} has invalid publishedAt`);
    if (source.signalStrength < 0 || source.signalStrength > 100) {
      errors.push(`Source ${source.id} has signalStrength outside 0-100`);
    }
    if (source.origin === "seed" && source.sourceUrl) errors.push(`Seed source ${source.id} must not be clickable`);
  }

  for (const asset of dataset.media) {
    if (!asset.alt.trim()) errors.push(`Media ${asset.id} requires alt text`);
    if (asset.width <= 0 || asset.height <= 0) errors.push(`Media ${asset.id} requires positive dimensions`);
  }

  return errors;
}
