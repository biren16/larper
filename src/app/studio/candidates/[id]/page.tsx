import { notFound, redirect } from "next/navigation";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { StoryEditor } from "../story-editor";
import { publishCandidateAction } from "../../actions";

export default async function StudioCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, query, runtime] = await Promise.all([params, searchParams, authorizedRuntime()]);
  const candidate = await runtime.reader.candidate(id);
  if (!candidate) notFound();
  return <StoryEditor candidate={candidate} publishAction={publishCandidateAction} error={query.error} />;
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
