export interface LiveFeedItem {
  id: string;
  nicheId: string;
  heat: number;
}

export interface RankedLiveFeedItem<T extends LiveFeedItem> {
  item: T;
  score: number;
}

export function rankLiveFeed<T extends LiveFeedItem>(items: T[], followedNicheIds: ReadonlySet<string>): RankedLiveFeedItem<T>[] {
  const pending = items
    .map((item) => ({ item, score: Math.round((item.heat * 0.9 + (followedNicheIds.has(item.nicheId) ? 10 : 0)) * 10) / 10 }))
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  const result: RankedLiveFeedItem<T>[] = [];
  const availableNiches = new Set(pending.map((entry) => entry.item.nicheId));
  const diversityTarget = Math.min(4, availableNiches.size);
  const usedNiches = new Set<string>();

  while (pending.length > 0) {
    const remainingFirstTenSlots = Math.max(0, 10 - result.length);
    const missingDiversity = Math.max(0, diversityTarget - usedNiches.size);
    const mustAddNiche = remainingFirstTenSlots <= missingDiversity;
    let index = pending.findIndex((entry) => {
      const previous = result.at(-1)?.item.nicheId;
      const beforePrevious = result.at(-2)?.item.nicheId;
      const wouldTriple = previous === entry.item.nicheId && beforePrevious === entry.item.nicheId;
      const addsNiche = !usedNiches.has(entry.item.nicheId);
      return !wouldTriple && (!mustAddNiche || addsNiche);
    });
    if (index < 0 && mustAddNiche) {
      index = pending.findIndex((entry) => !usedNiches.has(entry.item.nicheId));
    }
    if (index < 0) break;
    const [selected] = pending.splice(index, 1);
    result.push(selected);
    usedNiches.add(selected.item.nicheId);
  }
  return result;
}
