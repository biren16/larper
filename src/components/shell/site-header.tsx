import Link from "next/link";
import { Suspense } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { signOut } from "@/app/auth/actions";

import { PrimaryNav } from "./primary-nav";
import styles from "./site-header.module.css";

export function SiteHeader({ account }: { account?: { label: string; canOpenStudio: boolean } | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} href="/" aria-label="LARPer home">
          LARPer
        </Link>
        <Suspense fallback={<nav className={styles.nav} aria-label="Primary navigation"><Link className={styles.navLink} href="/">Discovery</Link><Link className={styles.navLink} href="/#your-larps">Your Larps</Link></nav>}><PrimaryNav /></Suspense>
        <div className={styles.actions}>
          {account === null && <Link className={styles.accountLink} href="/auth">Sign in</Link>}
          {account && <>
            {account.canOpenStudio && <Link className={styles.accountLink} href="/studio">Studio</Link>}
            <form action={signOut}><button className={styles.accountLink} type="submit" title={account.label}>Sign out</button></form>
          </>}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
