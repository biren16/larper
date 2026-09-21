import { notFound, redirect } from "next/navigation";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { StudioDashboard } from "./studio-dashboard";
import { addManualSignalAction } from "./actions";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }> }) {
  const runtime = await authorizedRuntime();
  const query = await searchParams;
  return <StudioDashboard data={await runtime.reader.dashboard()} manualSignalAction={addManualSignalAction} notice={first(query.notice)} error={first(query.error)} />;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

async function authorizedRuntime() {
  try {
    return await getEditorialRuntime();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") redirect("/auth?next=/studio");
    if (error instanceof Error && error.message === "Forbidden") notFound();
    throw error;
  }
}
