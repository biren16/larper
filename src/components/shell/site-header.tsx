import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

import { PrimaryNav } from "./primary-nav";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} href="/" aria-label="LARPer home">
          LARPer
        </Link>
        <PrimaryNav />
        <div className={styles.actions}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
