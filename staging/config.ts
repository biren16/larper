type Env = Readonly<Record<string, string | undefined>>;

export function assertSourceRegistryMatches(studio: string[], database: string[]) {
  const visibleIds = [...new Set(studio)].sort();
  const databaseIds = [...new Set(database)].sort();
  if (!visibleIds.length || visibleIds.length !== databaseIds.length || visibleIds.some((id, index) => id !== databaseIds[index])) {
    throw new Error("Studio and the configured staging database have different source registries; check deployment credentials before creating test records");
  }
}

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required for the staging release test`);
  return value;
}

function httpsUrl(value: string, label: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an HTTPS URL`); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${label} must be an HTTPS URL without credentials`);
  return url;
}

function origin(value: string, label: string): string {
  const url = httpsUrl(value, label);
  if (url.pathname !== "/" || url.search || url.hash) throw new Error(`${label} must be an origin without a path, query or fragment`);
  return url.origin;
}

export function readStagingConfig(env: Env) {
  if (required(env, "STAGING_ALLOW_MUTATIONS") !== "true") throw new Error("STAGING_ALLOW_MUTATIONS must be true for the isolated staging environment");
  const appUrl = origin(required(env, "STAGING_APP_URL"), "STAGING_APP_URL");
  const supabaseUrl = origin(required(env, "STAGING_SUPABASE_URL"), "STAGING_SUPABASE_URL");
  const productionApp = origin(required(env, "STAGING_PRODUCTION_APP_URL"), "STAGING_PRODUCTION_APP_URL");
  const productionSupabase = origin(required(env, "STAGING_PRODUCTION_SUPABASE_URL"), "STAGING_PRODUCTION_SUPABASE_URL");
  if (appUrl === productionApp || supabaseUrl === productionSupabase) throw new Error("The staging test refuses production targets");
  return {
    appUrl, supabaseUrl,
    serviceRoleKey: required(env, "STAGING_SUPABASE_SERVICE_ROLE_KEY"),
    ingestionSecret: required(env, "STAGING_INGESTION_SECRET"),
    authState: required(env, "STAGING_AUTH_STATE"),
    inputFile: required(env, "STAGING_INPUT_FILE"),
  };
}

function object(input: unknown, label: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error(`${label} must be an object`);
  return input as Record<string, unknown>;
}

function text(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required in the staging input file`);
  return value.trim();
}

function choice<T extends string>(input: Record<string, unknown>, key: string, choices: readonly T[]): T {
  const value = text(input, key);
  if (!choices.includes(value as T)) throw new Error(`${key} is invalid`);
  return value as T;
}

export function readStagingInput(value: unknown) {
  const input = object(value, "Staging input");
  const feed = object(input.feed, "feed");
  const manual = object(input.manual, "manual");
  const story = object(input.story, "story");
  if (story.independentSourcesConfirmed !== true) throw new Error("Review the two independent original sources before running the staging test");
  const usageReview = object(feed.usageReview, "feed.usageReview");
  const publishedAt = text(manual, "publishedAt");
  if (!Number.isFinite(Date.parse(publishedAt))) throw new Error("publishedAt must be a valid publication date");
  return {
    feed: {
      url: httpsUrl(text(feed, "url"), "feed.url").toString(),
      beat: choice(feed, "beat", ["f1", "books", "music", "tech-gaming", "screen-culture", "style", "internet-culture"]),
      usageReview: { termsUrl: httpsUrl(text(usageReview, "termsUrl"), "usageReview.termsUrl").toString(), basis: text(usageReview, "basis"), notes: text(usageReview, "notes") },
      trustTier: choice(feed, "trustTier", ["primary", "publication"]),
    },
    manual: {
      url: httpsUrl(text(manual, "url"), "manual.url").toString(),
      sourceDefinitionId: text(manual, "sourceDefinitionId"),
      title: text(manual, "title"), sourceName: text(manual, "sourceName"),
      publishedAt, nicheId: text(manual, "nicheId"),
      region: choice(manual, "region", ["india", "global"]),
    },
    story: {
      title: text(story, "title"), hook: text(story, "hook"), summary: text(story, "summary"),
      whyItMatters: text(story, "whyItMatters"), lore: text(story, "lore"),
      beginnerContext: text(story, "beginnerContext"), conversationLine: text(story, "conversationLine"),
      freshnessLabel: text(story, "freshnessLabel"), evidenceSummary: text(story, "evidenceSummary"),
    },
  };
}

export function readCultureStagingInput(value: unknown) {
  const input = object(value, "Seven-lane staging input");
  const lanes = ["music", "screen-culture", "style", "gaming-tech", "internet-culture", "books", "f1"];
  if (input.kind !== "seven-lanes" || !Array.isArray(input.lanes) || input.lanes.length !== lanes.length) throw new Error("Supply exactly the seven reviewed lanes");
  for (const [index, key] of lanes.entries()) {
    const lane = object(input.lanes[index], "lane");
    if (lane.key !== key || lane.receiptsChecked !== true || lane.independentOriginsConfirmed !== true) throw new Error(`Founder must review both receipts and original reporting for ${key}`);
  }
  return { kind: "seven-lanes" as const, lanes };
}
