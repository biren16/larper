import Link from "next/link";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.wordmark} href="/" aria-label="LARPer home">LARPer</Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Discovery</Link>
          <Link href={{ pathname: "/", hash: "your-larps" }}>Your Larps</Link>
        </nav>
      </div>
    </header>
  );
}
