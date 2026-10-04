"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./studio-navigation.module.css";
const destinations = [["/studio", "Overview"], ["/studio/posts", "Posts"], ["/studio/sources", "Sources"], ["/studio/media", "Media"]] as const;
export function StudioNavigation({environment,destination}:{environment:string;destination:string}) {
 const pathname=usePathname();
 const active=pathname.startsWith('/studio/candidates')||pathname.startsWith('/studio/starters')?'/studio/posts':pathname;
 return <nav className={styles.navigation} aria-label="Studio navigation">
 <strong className={styles.brand}>Studio</strong><div className={styles.links}>{destinations.map(([href,label])=><Link key={href} href={href} aria-current={active===href?'page':undefined}>{label}</Link>)}</div>
 <div className={styles.destination}><span className={styles.badge}>{environment}</span><a href={destination}>View website <span aria-hidden="true">↗</span></a></div>
 </nav>;
}
