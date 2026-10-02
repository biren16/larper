import { expect, it } from "vitest";
import { filterStyleTopics, parseStyleSubtopic } from "./style-subtopics";

it("includes overlap in both filters and preserves the all-style view", () => {
  const stories = [
    { id: "shoe", topic: { tags: ["sneakers"] } },
    { id: "both", topic: { tags: ["sneakers", "streetwear"] } },
    { id: "garment", topic: { tags: ["streetwear"] } },
    { id: "other", topic: { tags: ["thrifting"] } },
  ];
  expect(filterStyleTopics(stories, "sneakers").map((story) => story.id)).toEqual(["shoe", "both"]);
  expect(filterStyleTopics(stories, "streetwear").map((story) => story.id)).toEqual(["both", "garment"]);
  expect(filterStyleTopics(stories, null)).toHaveLength(4);
  expect(filterStyleTopics([stories[3]], "sneakers")).toEqual([]);
});

it("treats missing, repeated, or unknown filters as All Style", () => {
  expect(parseStyleSubtopic("sneakers")).toBe("sneakers");
  for (const value of [undefined, "unknown", ["sneakers", "streetwear"]]) expect(parseStyleSubtopic(value)).toBeNull();
});
