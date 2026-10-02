// Cron sends its explicit trigger in the scheduled HTTP body. Manual requests
// must not masquerade as evidence that the scheduler ran.
export function ingestionTrigger(body: unknown): "supabase_cron" | "manual" {
  return body && typeof body === "object" && (body as Record<string, unknown>).trigger === "supabase_cron" ? "supabase_cron" : "manual";
}
