import { StudioDashboard } from "./studio-dashboard";
import { addManualSignalAction } from "./actions";
import { authorizedStudioRuntime } from "./runtime";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }> }) {
  const runtime = await authorizedStudioRuntime();
  const query = await searchParams;
  return <StudioDashboard data={await runtime.reader.dashboard()} manualSignalAction={addManualSignalAction} notice={first(query.notice)} error={first(query.error)} />;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
