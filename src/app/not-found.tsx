import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main id="main-content" className={styles.main}>
      <p>Wrong rabbit hole.</p>
      <h1>Nothing is larping here.</h1>
      <Link href="/">Back to Discovery</Link>
    </main>
  );
}

