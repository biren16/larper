import Link from "next/link";
import { Suspense } from "react";

import { HeaderMenu } from "./header-menu";
import styles from "./site-header.module.css";

type SiteHeaderProps = {
  account?: { label: string; canOpenStudio: boolean } | null;
  signOutAction?: () => Promise<void>;
};

export function SiteHeader({ account, signOutAction }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} href="/" aria-label="larper home">
          larper
        </Link>
        <div className={styles.actions}>
          {account === null && <Link className={styles.accountLink} href="/auth">Sign in</Link>}
          {account && <>
            {account.canOpenStudio && <Link className={styles.accountLink} href="/studio">Studio</Link>}
            {signOutAction && <form action={signOutAction}><button className={styles.accountLink} type="submit" title={account.label}>Sign out</button></form>}
          </>}
          <Suspense fallback={<span aria-hidden className={styles.menuFallback} />}>
            <HeaderMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
