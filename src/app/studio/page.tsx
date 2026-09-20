import { notFound, redirect } from "next/navigation";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { StudioDashboard } from "./studio-dashboard";
import { addManualSignalAction, createSourceAction, toggleSourceAction } from "./actions";

export default async function StudioPage() {
  const runtime = await authorizedRuntime();
  return <StudioDashboard data={await runtime.reader.dashboard()} manualSignalAction={addManualSignalAction} createSourceAction={createSourceAction} toggleSourceAction={toggleSourceAction} />;
}

async function authorizedRuntime() {
  try {
    return await getEditorialRuntime();
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") redirect("/auth?next=/studio");
    if (error instanceof Error && error.message === "Forbidden") notFound();
    throw error;
  }
}
