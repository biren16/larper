const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "for", "from", "how", "in", "into", "is", "it", "of", "on", "the", "this", "to", "why", "with"]);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function normalizeTerms(value: string): string[] {
  return [...new Set(value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9#]+/g, " ")
    .split(/\s+/)
    .map((token) => stem(token.replace(/^#/, "")))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token)))];
}

export function similarity(left: string | string[], right: string | string[]): number {
  const a = new Set(Array.isArray(left) ? left : normalizeTerms(left));
  const b = new Set(Array.isArray(right) ? right : normalizeTerms(right));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((term) => b.has(term)).length;
  return intersection / new Set([...a, ...b]).size;
}

export interface ClusterCandidate {
  id: string;
  title: string;
  normalizedTerms: string[];
}

export function assignSignal(title: string, clusters: ClusterCandidate[], threshold = 0.3) {
  const terms = normalizeTerms(title);
  const ranked = clusters
    .map((cluster) => {
      const clusterTerms = normalizeTerms(cluster.normalizedTerms.join(" "));
      return { cluster: { ...cluster, normalizedTerms: clusterTerms }, score: similarity(terms, clusterTerms) };
    })
    .sort((a, b) => b.score - a.score || a.cluster.id.localeCompare(b.cluster.id));
  const best = ranked[0];
  if (!best || best.score < threshold) return null;
  const shared = terms.filter((term) => best.cluster.normalizedTerms.includes(term));
  return {
    clusterId: best.cluster.id,
    score: Math.round(best.score * 1000) / 10,
    reasons: shared.map((term) => `shared:${term}`),
  };
}
