import Link from "next/link";
import styles from "../page.module.css";

export default function CheckEmailPage() {
  return <main id="main-content" className={styles.main}><section className={styles.card}><p className={styles.eyebrow}>Link sent</p><h1>Check your inbox.</h1><p>Use the sign-in link in the email. You can close this tab, or keep browsing while it arrives.</p><Link className={styles.back} href="/">Back to discovery</Link></section></main>;
}
