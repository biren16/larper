export interface BriefCandidate {
  heat: number;
  confidence: number;
  independentSourceCount: number;
  allowlistedSourceCount: number;
  sensitiveFlags: string[];
}

const SENSITIVE_PATTERNS: Array<[string, RegExp]> = [
  ["allegation", /\b(allege[ds]?|allegation|accus(?:e[ds]?|ation)|rumou?r)\b/i],
  ["minors", /\b(child|children|minor|teen(?:age|ager)?|underage)\b/i],
  ["health", /\b(health|illness|diagnosis|hospital|medical|self-harm|suicide)\b/i],
  ["politics", /\b(election|government|minister|politic(?:s|al)?|vote|voting)\b/i],
  ["tragedy", /\b(death|died|killed|tragedy|fatal|disaster)\b/i],
  ["identity", /\b(caste|ethnicity|religion|sexuality|transgender|racial)\b/i],
];

export function detectSensitiveFlags(value: string): string[] {
  return SENSITIVE_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([flag]) => flag);
}

export function briefEligibility(candidate: BriefCandidate): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (candidate.heat < 70) reasons.push("heat_below_70");
  if (candidate.confidence < 80) reasons.push("confidence_below_80");
  if (candidate.independentSourceCount < 2) reasons.push("insufficient_independent_sources");
  if (candidate.allowlistedSourceCount < 2) reasons.push("insufficient_allowlisted_sources");
  reasons.push(...candidate.sensitiveFlags.map((flag) => `sensitive:${flag}`));
  return { eligible: reasons.length === 0, reasons };
}

export function shouldExpire(lastEvidenceAt: string, now: string, windowHours = 36): boolean {
  const age = Date.parse(now) - Date.parse(lastEvidenceAt);
  return !Number.isFinite(age) || age > windowHours * 3_600_000;
}
