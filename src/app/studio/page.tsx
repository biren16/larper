import { StudioDashboard } from "./studio-dashboard";
import { addManualSignalAction } from "./actions";
import { authorizedStudioRuntime } from "./runtime";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }> }) {
  const runtime = await authorizedStudioRuntime();
  const query = await searchParams;
  const [data,...counts]=await Promise.all([runtime.reader.dashboard(),...['draft','scheduled','needs_review','published'].map(tab=>runtime.client.rpc('list_editorial_posts',{p_query:{tab}}))]);
  for(const result of counts) if(result.error) throw new Error(result.error.message);
  const totals=counts.map(result=>Number((result.data as {total:number})?.total??0));
  data.taskCounts={drafts:totals[0],scheduled:totals[1],needsReview:totals[2],published:totals[3]};
  return <StudioDashboard data={data} manualSignalAction={addManualSignalAction} notice={first(query.notice)} error={first(query.error)} />;
}

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
