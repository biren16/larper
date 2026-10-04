import { createSourceAction, toggleSourceAction, registerSourcePresetsAction, reviewSourceUsageAction } from "../actions";
import { authorizedStudioRuntime } from "../runtime";
import { SourceManager } from "./source-manager";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function StudioSourcesPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[]; filter?: string; error?: string | string[] }> }) {
  const [runtime, query] = await Promise.all([authorizedStudioRuntime("/studio/sources"), searchParams]);
  return (
    <SourceManager
      initialFilter={["issues","attention","review","active","paused"].includes(query.filter ?? "") ? query.filter : "all"}
      data={await runtime.reader.sources()}
      createSourceAction={createSourceAction}
      toggleSourceAction={toggleSourceAction}
      registerPresetsAction={registerSourcePresetsAction}
      reviewSourceAction={reviewSourceUsageAction}
      notice={first(query.notice)}
      error={first(query.error)}
    />
  );
}
