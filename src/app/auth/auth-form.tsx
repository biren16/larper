import { signInWithGoogle, sendMagicLink } from "./actions";
import { PendingButton } from "../studio/pending-button";
import styles from "./page.module.css";

export function AuthForm({ next = "/", error, providers = { google: true, email: true } }: { next?: string; error?: string; providers?: { google: boolean; email: boolean } }) {
  return (
    <section className={styles.card} aria-labelledby="auth-heading">
      <p className={styles.eyebrow}>Optional account</p>
      <h1 id="auth-heading">Keep your rabbit holes.</h1>
      <p>Browsing stays free and open. Sign in only if you want follows and saves to travel with you.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {providers.google && <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <PendingButton className={styles.google} type="submit" pendingLabel="Opening Google…">Continue with Google</PendingButton>
      </form>}
      {providers.google && providers.email && <div className={styles.divider}><span>or</span></div>}
      {providers.email && <form className={styles.emailForm} action={sendMagicLink}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="auth-email">Email address</label>
        <input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <PendingButton type="submit" pendingLabel="Sending link…">Email me a sign-in link</PendingButton>
      </form>}
      {!providers.google && !providers.email && <p role="status">Sign-in is temporarily unavailable. Try again shortly; browsing remains open.</p>}
      <small>No password, no public profile, no messages.</small>
    </section>
  );
}
