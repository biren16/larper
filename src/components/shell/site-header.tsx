import Link from "next/link";
import { Suspense } from "react";

import { HeaderChrome } from "./header-chrome";
import type { HeaderAccount } from "./header-types";
import styles from "./site-header.module.css";

type SiteHeaderProps = {
  account?: HeaderAccount | null;
  signOutAction?: () => Promise<void>;
};

export function SiteHeader({ account, signOutAction }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} href="/" aria-label="larper home">
          larper
        </Link>
        <Suspense fallback={<><span aria-hidden className={styles.context} /><div className={styles.actions}><span aria-hidden className={styles.menuFallback} /></div></>}>
          <HeaderChrome account={account} signOutAction={signOutAction} />
        </Suspense>
      </div>
    </header>
  );
}
