// Dependency-free so the deployed Edge collector uses the same activation rule.
export function hasUsageReview(config: unknown): boolean {
  if (!config || typeof config !== "object") return false;
  const review = (config as Record<string, unknown>).usageReview;
  if (!review || typeof review !== "object") return false;
  const data = review as Record<string, unknown>;
  return ["reviewedBy", "termsUrl", "basis", "notes"].every((key) => typeof data[key] === "string" && Boolean(String(data[key]).trim()))
    && typeof data.termsUrl === "string" && /^https?:\/\//.test(data.termsUrl)
    && typeof data.reviewedAt === "string" && Number.isFinite(Date.parse(data.reviewedAt));
}
