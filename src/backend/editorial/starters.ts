import content from "./seven-lane-starters.json";
import type { StoryDraft } from "./types";

export interface StarterDraft {
  key: string;
  researchedAt: string;
  originAssessment: string;
  receipts: Array<{ presetKey: string; url: string; title: string; publishedAt: string; author: string; assessment: string }>;
  draft: StoryDraft;
}
export const SEVEN_LANE_STARTERS = content as StarterDraft[];
export function starterForKey(key: string): StarterDraft {
  const starter = SEVEN_LANE_STARTERS.find((item) => item.key === key);
  if (!starter) throw new Error("Unknown starter lane");
  return starter;
}
