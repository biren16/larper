import { Suspense } from "react";
import { connection } from "next/server";
import { DiscoveryHome } from "@/components/discovery/discovery-home";
import { getCachedDiscoveryHome } from "@/data/discovery-cache";

async function LiveDiscoveryHome() {
  await connection();
  const home = await getCachedDiscoveryHome();
  return <DiscoveryHome home={home} />;
}

export default function HomePage() {
  return <Suspense fallback={<main id="main-content"><p className="srOnly">Loading the latest verified edition…</p></main>}><LiveDiscoveryHome /></Suspense>;
}
