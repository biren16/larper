import Link from "next/link";
import { PostsManager } from "../../posts/posts-manager";
import { notFound } from "next/navigation";
import { StoryEditor } from "../story-editor";
import { saveCandidateDraftAction, mergeCandidateAction, publishCandidateAction, scheduleCandidateAction, splitCandidateAction, transitionCandidateAction, uploadEditorialMediaAction } from "../../actions";
import { authorizedStudioRuntime } from "../../runtime";

export default async function StudioCandidatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string; returnTo?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const runtime = await authorizedStudioRuntime(`/studio/candidates/${id}`);
  const candidate = await runtime.reader.candidate(id);
  if (!candidate) notFound();
  if (candidate.trashedAt) return <main id="main-content"><h1>{candidate.title} · Trash</h1><p>Restore privately before editing or approving this post.</p><Link href="/studio/posts?tab=trash">Back to Trash</Link><PostsManager posts={[{id:candidate.id,title:candidate.title,nicheId:candidate.nicheId,status:"trash",lastEditedAt:candidate.trashedAt,editorialVersion:candidate.editorialVersion??0}]} niches={[]} returnTo="/studio/posts?tab=trash"/></main>;
  const returnTo=query.returnTo?.startsWith("/studio/posts?") && !query.returnTo.includes("\\") ? query.returnTo : "/studio/posts";
  return <StoryEditor candidate={{ ...candidate, returnTo, accountId: runtime.actor.id, environment: process.env.NEXT_PUBLIC_SITE_URL ?? "local" }} publishAction={publishCandidateAction} saveDraftAction={saveCandidateDraftAction} notice={query.notice} scheduleAction={scheduleCandidateAction} transitionAction={transitionCandidateAction} mergeAction={mergeCandidateAction} splitAction={splitCandidateAction} uploadMediaAction={uploadEditorialMediaAction} error={query.error} />;
}
