import type { EditorialActor } from "./types";

export function assertEditorialAccess(actor: EditorialActor | null, allowlistedEmails: ReadonlySet<string>): asserts actor is EditorialActor {
  if (!actor) throw new Error("Unauthorized");
  const allowedRole = actor.role === "editor" || actor.role === "founder";
  if (!allowedRole || !allowlistedEmails.has(actor.email.toLowerCase())) throw new Error("Forbidden");
}
