import { readPublicSupabaseConfig, type Environment } from "@/backend/config/env";

// Read the enabled methods from this project's public Auth settings, never another environment.
export async function getAuthProviders() {
  const config = readPublicSupabaseConfig(process.env, (process.env.NODE_ENV ?? "development") as Environment);
  if (!config) return { google: false, email: false };
  try {
    const result = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(5000), cache: "no-store",
    });
    if (!result.ok) return { google: false, email: false };
    const settings = await result.json();
    return { google: settings.external?.google === true, email: settings.external?.email === true };
  } catch { return { google: false, email: false }; }
}
