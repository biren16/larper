export interface AccountUser {
  id: string;
  email: string;
}

export interface InteractionInput {
  eventName: string;
  storyId?: string;
  nicheId?: string;
  properties?: Record<string, string | number | boolean>;
}

export interface StoredInteraction extends InteractionInput {
  userId: string | null;
  anonymousId: string | null;
  properties: Record<string, string | number | boolean>;
}

export interface AccountStore {
  filterExistingNicheIds(nicheIds: string[]): Promise<string[]>;
  listFollowedNicheIds(userId: string): Promise<string[]>;
  addFollows(userId: string, nicheIds: string[]): Promise<void>;
  setFollow(userId: string, nicheId: string, followed: boolean): Promise<void>;
  isSaved(userId: string, storyId: string): Promise<boolean>;
  setSaved(userId: string, storyId: string, saved: boolean): Promise<void>;
  recordInteraction(event: StoredInteraction): Promise<void>;
}

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const INTERACTION_EVENTS = new Set(["story_open", "story_save", "niche_follow"]);

function requireUser(user: AccountUser | null): AccountUser {
  if (!user) throw new Error("Sign in required");
  return user;
}

function safeId(value: string, label: string): string {
  const id = value.trim();
  if (!SAFE_ID.test(id)) throw new Error(`${label} is invalid`);
  return id;
}

export class AccountService {
  constructor(private readonly store: AccountStore) {}

  async mergeLocalFollows(user: AccountUser | null, localNicheIds: string[]): Promise<string[]> {
    const actor = requireUser(user);
    const existing = await this.store.listFollowedNicheIds(actor.id);
    const validLocal = [...new Set(localNicheIds.map((id) => id.trim()).filter((id) => SAFE_ID.test(id)))];
    const existingLocal = await this.store.filterExistingNicheIds(validLocal);
    const additions = existingLocal.filter((id) => !existing.includes(id));
    if (additions.length > 0) await this.store.addFollows(actor.id, additions);
    return [...new Set([...existing, ...existingLocal])];
  }

  async setFollow(user: AccountUser | null, nicheId: string, followed: boolean): Promise<void> {
    await this.store.setFollow(requireUser(user).id, safeId(nicheId, "Niche"), followed);
  }

  async isSaved(user: AccountUser | null, storyId: string): Promise<boolean> {
    return this.store.isSaved(requireUser(user).id, safeId(storyId, "Story"));
  }

  async setSaved(user: AccountUser | null, storyId: string, saved: boolean): Promise<void> {
    await this.store.setSaved(requireUser(user).id, safeId(storyId, "Story"), saved);
  }

  async recordInteraction(user: AccountUser | null, anonymousId: string | null, input: InteractionInput): Promise<void> {
    if (!INTERACTION_EVENTS.has(input.eventName)) throw new Error("Interaction event is invalid");
    const normalizedAnonymousId = user ? null : anonymousId?.trim() ?? null;
    if (!user && (!normalizedAnonymousId || normalizedAnonymousId.length < 16 || normalizedAnonymousId.length > 96)) {
      throw new Error("Anonymous identifier is invalid");
    }
    const properties = input.properties ?? {};
    if (Object.keys(properties).length > 4 || Object.values(properties).some((value) => typeof value === "string" && value.length > 80)) {
      throw new Error("Interaction properties are too broad");
    }
    await this.store.recordInteraction({
      userId: user?.id ?? null,
      anonymousId: normalizedAnonymousId,
      eventName: input.eventName,
      storyId: input.storyId ? safeId(input.storyId, "Story") : undefined,
      nicheId: input.nicheId ? safeId(input.nicheId, "Niche") : undefined,
      properties,
    });
  }
}
