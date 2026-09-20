import { DiscoveryHome } from "@/components/discovery/discovery-home";
import { getCachedDiscoveryHome } from "@/data/discovery-cache";

export default async function HomePage() {
  const home = await getCachedDiscoveryHome();
  return <DiscoveryHome home={home} />;
}
