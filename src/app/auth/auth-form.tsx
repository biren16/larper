import { signInWithGoogle, sendMagicLink } from "./actions";
import styles from "./page.module.css";

export function AuthForm({ next = "/", error }: { next?: string; error?: string }) {
  return (
    <section className={styles.card} aria-labelledby="auth-heading">
      <p className={styles.eyebrow}>Optional account</p>
      <h1 id="auth-heading">Keep your rabbit holes.</h1>
      <p>Browsing stays free and open. Sign in only if you want follows and saves to travel with you.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button className={styles.google} type="submit">Continue with Google</button>
      </form>
      <div className={styles.divider}><span>or</span></div>
      <form className={styles.emailForm} action={sendMagicLink}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <button type="submit">Email me a sign-in link</button>
      </form>
      <small>No password, no public profile, no messages.</small>
    </section>
  );
}
