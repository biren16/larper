import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const query: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: null, error: { message: "permission denied for table saves" } })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { client: { from: vi.fn(() => query) } };
});

vi.mock("@/backend/accounts/current-user", () => ({
  getCurrentAccountUser: vi.fn(async () => ({ id: "user-1", email: "member@example.com", displayName: null, role: "member" })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => mocks.client),
}));

import { SavedStoryControl } from "./saved-story-control";

describe("SavedStoryControl", () => {
  it("does not crash the story when the saved-state lookup fails", async () => {
    await expect(SavedStoryControl({ storyId: "story-1", returnPath: "/discover/drake" })).resolves.toBeNull();
  });
});
