import { Suspense } from "react";
import { connection } from "next/server";
import { DiscoveryHome } from "@/components/discovery/discovery-home";
import { DiscoveryIntro } from "@/components/discovery/discovery-intro";
import { getCachedDiscoveryHome } from "@/data/discovery-cache";

async function LiveDiscoveryHome() {
  await connection();
  const home = await getCachedDiscoveryHome();
  return <DiscoveryHome home={home} />;
}

export function HomeLoading() {
  return <main id="main-content" aria-busy="true" style={{ minHeight: "100vh" }}><p className="srOnly">Loading the latest verified edition…</p></main>;
}

export default function HomePage() {
  return <>
    <DiscoveryIntro />
    <Suspense fallback={<HomeLoading />}>
      <LiveDiscoveryHome />
    </Suspense>
  </>;
}
