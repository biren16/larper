import { notFound, redirect } from "next/navigation";
import { getEditorialRuntime } from "@/backend/editorial/runtime";

export async function authorizedStudioRuntime(next = "/studio") {
  try {
    return await getEditorialRuntime();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") redirect(`/auth?next=${next}`);
    if (error instanceof Error && error.message === "Forbidden") notFound();
    throw error;
  }
}
