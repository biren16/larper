import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main-content" className={styles.main}>
      <p className={styles.eyebrow}>Page unavailable</p>
      <h1>Wrong rabbit hole.</h1>
      <p className={styles.description}>This page may have moved, or your account may not have access yet.</p>
      <Link href="/">Back to Discovery</Link>
    </main>
  );
}
