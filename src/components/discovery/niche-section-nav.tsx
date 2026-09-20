import Link from "next/link";

import styles from "./niche-section-nav.module.css";

export function NicheSectionNav({ nicheName, hasLore }: { nicheName: string; hasLore: boolean }) {
  return (
    <nav className={styles.nav} aria-label={`${nicheName} sections`}>
      <span className={styles.label}>{nicheName}</span>
      <div className={styles.links}>
        <Link href="#current">Current</Link>
        {hasLore && <Link href="#lore">Lore</Link>}
        <Link href="#adjacent">Adjacent</Link>
      </div>
    </nav>
  );
}
