import { ImageResponse } from "next/og";
import { coverContextForTopic, coverPresentation } from "@/components/discovery/cover-presentation";
import { getCachedTopicDetail } from "@/data/discovery-cache";

export const alt = "LARPer story cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const backgrounds = { motorsport: "#d7e4ec", music: "#e6dce9", screen: "#ebe2cd", culture: "#dce8cf" };

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getCachedTopicDetail(slug);
  const cover = detail ? coverPresentation(coverContextForTopic(detail)) : coverPresentation({
    title: "Find your next obsession", niche: "Culture", nicheId: "culture", type: "DISCOVERY", seed: slug,
  });
  return new ImageResponse(
    <div style={{ background: backgrounds[cover.treatment], color: "#152537", display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", padding: 58, width: "100%" }}>
      <div style={{ borderTop: "5px solid #152537", display: "flex", fontFamily: "sans-serif", fontSize: 24, fontWeight: 700, justifyContent: "space-between", letterSpacing: 3, paddingTop: 15 }}>
        <span>LARPER / FIELD NOTES</span><span>№ {cover.serial}</span>
      </div>
      <div style={{ color: "#2859ce", display: "flex", fontFamily: "sans-serif", fontSize: 150, fontWeight: 800, lineHeight: 1 }}>↗</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{cover.label}</span>
        <span style={{ fontFamily: "sans-serif", fontSize: cover.title.length > 55 ? 54 : 72, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>{cover.title}</span>
      </div>
    </div>,
    size,
  );
}
