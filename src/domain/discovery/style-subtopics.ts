export type StyleSubtopic = "sneakers" | "streetwear";

export function parseStyleSubtopic(value: string | string[] | undefined): StyleSubtopic | null {
  return value === "sneakers" || value === "streetwear" ? value : null;
}

export function filterStyleTopics<T extends { topic: { tags: string[] } }>(topics: T[], subtopic: StyleSubtopic | null): T[] {
  return subtopic ? topics.filter((item) => item.topic.tags.some((tag) => tag.toLowerCase() === subtopic)) : topics;
}
