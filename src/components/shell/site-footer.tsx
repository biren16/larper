import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.mark} href="/">LARPer</Link>
        <p>Find new shit to get obsessed with.</p>
      </div>
      <p className={styles.note}>Part 1 discovery foundation. No fake live feeds.</p>
    </footer>
  );
}

