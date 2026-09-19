import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.mark} href="/">LARPer</Link>
        <p>Find new shit to get obsessed with.</p>
      </div>
      <p className={styles.note}>Seeded Part 1 edition. Live ingestion comes later.</p>
    </footer>
  );
}
