import { createClient } from "@supabase/supabase-js";
import { readPublicSupabaseConfig, type Environment } from "@/backend/config/env";
import type { DiscoveryRepository } from "@/domain/discovery/types";
import { PostgresDiscoveryRepository, type DiscoveryDatabaseReader } from "./postgres/repository";
import { SupabaseDiscoveryReader } from "./postgres/supabase-reader";
import type { Database } from "./postgres/database.types";
import { seedRepository } from "./seed/repository";

type PublicConfig = { url: string; publishableKey: string };
interface RuntimeOptions {
  env: Readonly<Record<string, string | undefined>>;
  environment: Environment;
  createReader?: (config: PublicConfig) => DiscoveryDatabaseReader;
}

function defaultReader(config: PublicConfig): DiscoveryDatabaseReader {
  const client = createClient<Database>(config.url, config.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return new SupabaseDiscoveryReader(client);
}

export function createRuntimeDiscoveryRepository(options: RuntimeOptions): DiscoveryRepository {
  const config = readPublicSupabaseConfig(options.env, options.environment);
  if (!config) return seedRepository;
  return new PostgresDiscoveryRepository((options.createReader ?? defaultReader)(config));
}

let repository: DiscoveryRepository | undefined;
export function getDiscoveryRepository(): DiscoveryRepository {
  repository ??= createRuntimeDiscoveryRepository({
    env: process.env,
    environment: (process.env.NODE_ENV ?? "development") as Environment,
  });
  return repository;
}
