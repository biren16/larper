import { createSourceAction, toggleSourceAction } from "../actions";
import { authorizedStudioRuntime } from "../runtime";
import { SourceManager } from "./source-manager";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function StudioSourcesPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[]; error?: string | string[] }> }) {
  const [runtime, query] = await Promise.all([authorizedStudioRuntime("/studio/sources"), searchParams]);
  return (
    <SourceManager
      data={await runtime.reader.sources()}
      createSourceAction={createSourceAction}
      toggleSourceAction={toggleSourceAction}
      notice={first(query.notice)}
      error={first(query.error)}
    />
  );
}
