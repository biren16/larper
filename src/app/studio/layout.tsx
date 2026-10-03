import Link from "next/link";
import { Suspense } from "react";
import { authorizedStudioRuntime } from "./runtime";
import styles from "./studio-navigation.module.css";
async function StudioNavigation() {
 await authorizedStudioRuntime();
 const environment = process.env.VERCEL_ENV === "preview" ? "Staging" : process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" ? "Production" : "Development";
 const destination = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
 return <nav className={styles.navigation} aria-label="Studio navigation"><strong>Studio</strong><Link href="/studio">Overview</Link><Link href="/studio/posts">Posts</Link><Link href="/studio/sources">Sources</Link><Link href="/studio/media">Media</Link><span>{environment} · <a href={destination.origin}>{destination.hostname}</a></span></nav>;
}
export default function StudioLayout({children}: {children: React.ReactNode}) {
 return <><Suspense fallback={<p>Opening Studio…</p>}><StudioNavigation /></Suspense>{children}</>;
}
