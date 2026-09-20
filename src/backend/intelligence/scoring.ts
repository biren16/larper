import { calculateLiveHeat, type HeatComponents } from "@/domain/discovery/heat";

export const calculateHeat = (components: HeatComponents) => calculateLiveHeat(components);

export interface MetricSnapshot {
  capturedAt: string;
  metrics: Record<string, number>;
}

function totalMetrics(snapshot: MetricSnapshot): number {
  return Object.values(snapshot.metrics).reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0);
}

export function calculateMomentum(snapshots: MetricSnapshot[], baselinePerHour: number): number {
  if (snapshots.length < 2 || baselinePerHour <= 0) return 0;
  const sorted = [...snapshots].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const first = sorted[0];
  const last = sorted.at(-1)!;
  const hours = (Date.parse(last.capturedAt) - Date.parse(first.capturedAt)) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  const rate = Math.max(0, totalMetrics(last) - totalMetrics(first)) / hours;
  return Math.round(Math.min(100, (rate / baselinePerHour) * 50) * 10) / 10;
}

export function calculateConfidence(input: {
  independentSourceCount: number;
  allowlistedSourceCount: number;
  coherence: number;
  temporalCoherence: number;
}): number {
  const independent = Math.min(4, Math.max(0, input.independentSourceCount));
  const allowlistedRatio = independent === 0 ? 0 : Math.min(1, Math.max(0, input.allowlistedSourceCount) / independent);
  const score = independent * 10 + allowlistedRatio * 30 + Math.max(0, Math.min(100, input.coherence)) * 0.3 + Math.max(0, Math.min(100, input.temporalCoherence)) * 0.1;
  return Math.round(Math.min(100, score) * 10) / 10;
}
