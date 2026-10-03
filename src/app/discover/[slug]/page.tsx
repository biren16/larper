import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InteractionBeacon } from "@/components/accounts/interaction-beacon";
import { SavedStoryControl } from "@/components/accounts/saved-story-control";
import { Suspense } from "react";
import { getCachedTopicDetail } from "@/data/discovery-cache";
import { PublicStoryPresentation } from "@/components/discovery/public-story-presentation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  if (!detail) return { title: "Rabbit hole not found" };
  return { title: detail.topic.title, description: detail.topic.hook };
}

export const instant = false;

export default async function TopicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  if (!detail) notFound();
  return <PublicStoryPresentation detail={detail}
    beacon={<InteractionBeacon storyId={detail.topic.id} nicheId={detail.niche.id} />}
    saveControl={<Suspense fallback={<span>Checking saves…</span>}><SavedStoryControl storyId={detail.topic.id} returnPath={`/discover/${detail.topic.slug}`} /></Suspense>} />;
}
