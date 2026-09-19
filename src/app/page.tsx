import { DiscoveryHome } from "@/components/discovery/discovery-home";
import { seedRepository } from "@/data/seed/repository";
import { buildDiscoveryHome } from "@/domain/discovery/services";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";

export default async function HomePage() {
  const home = await buildDiscoveryHome(seedRepository, DEFAULT_FOLLOWED_NICHE_IDS);
  return <DiscoveryHome home={home} />;
}

