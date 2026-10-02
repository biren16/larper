import type { StarterDraft } from "../src/backend/editorial/starters";
import { normalizeManualSignal } from "../src/backend/ingestion/manual";
import { sourceOriginKey } from "../src/backend/ingestion/source-catalog";
import type { SourceDefinition } from "../src/backend/ingestion/types";

export function cultureManualCaptures(starter: StarterDraft, sources: SourceDefinition[]) {
  const captures = starter.receipts.map((receipt) => {
    const source = sources.find((row) => row.config?.presetKey === receipt.presetKey);
    if (!source) throw new Error(`Missing registered publisher ${receipt.presetKey}`);
    const region = starter.draft.regions.includes("india") ? "india" : "global";
    const signal = normalizeManualSignal({ url: receipt.url, title: receipt.title, sourceName: source.name,
      publishedAt: receipt.publishedAt, region, platform: "web", suggestedNicheId: starter.key,
    }, source, new Date().toISOString());
    return { sourceDefinitionId: source.id, sourceName: source.name, trustTier: signal.trustTier,
      originKey: sourceOriginKey(source), url: signal.canonicalUrl, title: receipt.title, region,
      nicheId: starter.key, publishedAt: signal.publishedAt,
      // Studio interprets datetime-local as Asia/Kolkata regardless of browser timezone.
      publishedLocal: new Date(Date.parse(signal.publishedAt) + 330 * 60_000).toISOString().slice(0, 16),
    };
  });
  if (captures.length !== 2 || new Set(captures.map((capture) => capture.originKey)).size !== 2) throw new Error("Starter needs two independently assessed origins");
  if (!captures.some((capture) => capture.trustTier === "primary" || capture.trustTier === "publication")) throw new Error("Starter needs a credible publication or primary source");
  return captures;
}
