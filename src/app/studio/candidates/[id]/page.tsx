import { notFound } from "next/navigation";
import { StoryEditor } from "../story-editor";
import { saveCandidateDraftAction, mergeCandidateAction, publishCandidateAction, scheduleCandidateAction, splitCandidateAction, transitionCandidateAction, uploadEditorialMediaAction } from "../../actions";
import { authorizedStudioRuntime } from "../../runtime";

export default async function StudioCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const runtime = await authorizedStudioRuntime(`/studio/candidates/${id}`);
  const candidate = await runtime.reader.candidate(id);
  if (!candidate) notFound();
  return <StoryEditor candidate={candidate} publishAction={publishCandidateAction} saveDraftAction={saveCandidateDraftAction} notice={query.notice} scheduleAction={scheduleCandidateAction} transitionAction={transitionCandidateAction} mergeAction={mergeCandidateAction} splitAction={splitCandidateAction} uploadMediaAction={uploadEditorialMediaAction} error={query.error} />;
}
