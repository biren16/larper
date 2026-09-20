import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <Link className={styles.mark} href="/">LARPer</Link>
        <p>Find new shit to get obsessed with.<br />Stay for the lore.</p>
      </div>
      <div className={styles.endMatter}>
        <Link href="/#larping-now">Larping RN</Link>
        <Link href="/#your-larps">Your Larps</Link>
        <p className={styles.note}>Seeded demo edition. Live signals come with the engine.</p>
      </div>
    </footer>
  );
}
