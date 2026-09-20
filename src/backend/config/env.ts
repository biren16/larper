export type Environment = "development" | "test" | "production";
type Env = Readonly<Record<string, string | undefined>>;

function required(env: Env, key: string, environment: Environment): string | null {
  const value = env[key]?.trim();
  if (value) return value;
  if (environment === "production") throw new Error(`${key} is required in production`);
  return null;
}

export function readPublicSupabaseConfig(env: Env, environment: Environment) {
  const url = required(env, "NEXT_PUBLIC_SUPABASE_URL", environment);
  const publishableKey = required(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", environment);
  return url && publishableKey ? { url, publishableKey } : null;
}

export function readServerSupabaseConfig(env: Env, environment: Environment) {
  const url = required(env, "NEXT_PUBLIC_SUPABASE_URL", environment);
  const serviceRoleKey = required(env, "SUPABASE_SERVICE_ROLE_KEY", environment);
  return url && serviceRoleKey ? { url, serviceRoleKey } : null;
}

export function readSiteUrl(env: Env, environment: Environment): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (environment === "production") throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
  return "http://localhost:3000";
}
