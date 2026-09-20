import { describe, expect, it, vi } from "vitest";
import { AccountService, type AccountStore } from "./service";

const user = { id: "user-1", email: "member@example.com" };

function store(overrides: Partial<AccountStore> = {}): AccountStore {
  return {
    filterExistingNicheIds: vi.fn(async (ids) => ids),
    listFollowedNicheIds: vi.fn(async () => ["books"]),
    addFollows: vi.fn(async () => undefined),
    setFollow: vi.fn(async () => undefined),
    isSaved: vi.fn(async () => false),
    setSaved: vi.fn(async () => undefined),
    recordInteraction: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("AccountService", () => {
  it("merges local follows into the signed-in account without duplicates", async () => {
    const accountStore = store();
    const service = new AccountService(accountStore);

    await expect(service.mergeLocalFollows(user, ["books", "f1", "f1", "bad id"])).resolves.toEqual(["books", "f1"]);
    expect(accountStore.addFollows).toHaveBeenCalledWith("user-1", ["f1"]);
  });

  it("authorizes follow and save writes from the resolved user only", async () => {
    const accountStore = store();
    const service = new AccountService(accountStore);

    await service.setFollow(user, "books", true);
    await service.setSaved(user, "story-1", true);

    expect(accountStore.setFollow).toHaveBeenCalledWith("user-1", "books", true);
    expect(accountStore.setSaved).toHaveBeenCalledWith("user-1", "story-1", true);
    await expect(service.setSaved(null, "story-1", true)).rejects.toThrow("Sign in required");
  });

  it("records only allowlisted, privacy-minimal interaction data", async () => {
    const accountStore = store();
    const service = new AccountService(accountStore);

    await service.recordInteraction(null, "anon-1234567890123456", { eventName: "story_open", storyId: "story-1", nicheId: "books" });
    expect(accountStore.recordInteraction).toHaveBeenCalledWith(expect.objectContaining({
      userId: null, anonymousId: "anon-1234567890123456", eventName: "story_open", properties: {},
    }));
    await expect(service.recordInteraction(null, "anon", { eventName: "email", properties: { email: "nope@example.com" } })).rejects.toThrow();
  });
});
