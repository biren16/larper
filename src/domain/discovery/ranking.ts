import type { DiscoveryTopic, SourceSignal } from "./types";

export interface RankedTopic {
  topic: DiscoveryTopic;
  score: number;
  evidenceScore: number;
  sourceCount: number;
}

export function calculateEvidenceScore(signals: SourceSignal[]): number {
  const sourceTypes = new Set(signals.map((signal) => signal.sourceType));
  return Math.min(100, signals.length * 15 + sourceTypes.size * 10);
}

function signalsForTopic(sourceSignals: SourceSignal[], topicId: string): SourceSignal[] {
  return sourceSignals.filter((signal) => signal.topicId === topicId);
}

function sortRankedTopics(a: RankedTopic, b: RankedTopic): number {
  if (b.score !== a.score) return b.score - a.score;
  const dateDifference = Date.parse(b.topic.lastUpdatedAt) - Date.parse(a.topic.lastUpdatedAt);
  if (dateDifference !== 0) return dateDifference;
  return a.topic.id.localeCompare(b.topic.id);
}

export function rankCurrentTopics(
  topics: DiscoveryTopic[],
  sourceSignals: SourceSignal[],
  followedNicheIds: ReadonlySet<string>,
): RankedTopic[] {
  return topics
    .filter((topic) => topic.status === "published" && topic.mode === "current")
    .map((topic) => {
      const topicSignals = signalsForTopic(sourceSignals, topic.id);
      const evidenceScore = calculateEvidenceScore(topicSignals);
      const affinity = followedNicheIds.has(topic.nicheId) ? 100 : 0;
      const score =
        topic.signals.freshness * 0.3 +
        topic.signals.momentum * 0.3 +
        evidenceScore * 0.2 +
        topic.signals.novelty * 0.15 +
        affinity * 0.05;

      return { topic, score, evidenceScore, sourceCount: topicSignals.length };
    })
    .sort(sortRankedTopics);
}

export function rankDeepLore(
  topics: DiscoveryTopic[],
  sourceSignals: SourceSignal[],
): RankedTopic[] {
  return topics
    .filter((topic) => topic.status === "published" && topic.mode === "deep-lore")
    .map((topic) => {
      const topicSignals = signalsForTopic(sourceSignals, topic.id);
      const evidenceScore = calculateEvidenceScore(topicSignals);
      return {
        topic,
        score: topic.signals.novelty * 0.6 + evidenceScore * 0.4,
        evidenceScore,
        sourceCount: topicSignals.length,
      };
    })
    .sort(sortRankedTopics);
}
