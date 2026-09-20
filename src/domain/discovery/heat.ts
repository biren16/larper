export interface HeatComponents {
  momentum: number;
  sourceDiversity: number;
  freshness: number;
  novelty: number;
  indiaRelevance: number;
  crossover: number;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function calculateLiveHeat(components: HeatComponents): number {
  const score =
    clamp(components.momentum) * 0.3 +
    clamp(components.sourceDiversity) * 0.2 +
    clamp(components.freshness) * 0.15 +
    clamp(components.novelty) * 0.15 +
    clamp(components.indiaRelevance) * 0.1 +
    clamp(components.crossover) * 0.1;
  return Math.round(score * 10) / 10;
}
