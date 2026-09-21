import { notFound } from "next/navigation";
import { StoryEditor } from "../story-editor";
import { mergeCandidateAction, publishCandidateAction, scheduleCandidateAction, splitCandidateAction, transitionCandidateAction } from "../../actions";
import { authorizedStudioRuntime } from "../../runtime";

export default async function StudioCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, query, runtime] = await Promise.all([params, searchParams, authorizedStudioRuntime("/studio")]);
  const candidate = await runtime.reader.candidate(id);
  if (!candidate) notFound();
  return <StoryEditor candidate={candidate} publishAction={publishCandidateAction} scheduleAction={scheduleCandidateAction} transitionAction={transitionCandidateAction} mergeAction={mergeCandidateAction} splitAction={splitCandidateAction} error={query.error} />;
}
