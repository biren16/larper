import Link from "next/link";
import { Suspense } from "react";
import { authorizedStudioRuntime } from "./runtime";
import styles from "./studio-navigation.module.css";
async function StudioNavigation() {
 await authorizedStudioRuntime();
 const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
 return <nav className={styles.navigation} aria-label="Studio navigation"><strong>Studio</strong><Link href="/studio">Overview</Link><Link href="/studio/posts">Posts</Link><Link href="/studio/sources">Sources</Link><Link href="/studio/media">Media</Link><span>{environment} · <Link href="/">Public site</Link></span></nav>;
}
export default function StudioLayout({children}: {children: React.ReactNode}) {
 return <><Suspense fallback={<p>Opening Studio…</p>}><StudioNavigation /></Suspense>{children}</>;
}
