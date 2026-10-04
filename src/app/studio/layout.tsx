import { StudioNavigation } from "./studio-navigation";
import { Suspense } from "react";
import { authorizedStudioRuntime } from "./runtime";

async function AuthorizedNavigation() {
 await authorizedStudioRuntime();
 const environment = process.env.VERCEL_ENV === "preview" ? "Staging" : process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" ? "Production" : "Development";
 const destination = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
 return <StudioNavigation environment={environment} destination={destination.origin}/>;
}
export default function StudioLayout({children}: {children: React.ReactNode}) {
 return <><Suspense fallback={<p>Opening Studio…</p>}><AuthorizedNavigation /></Suspense>{children}</>;
}
