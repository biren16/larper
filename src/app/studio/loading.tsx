import styles from './studio.module.css';

export default function StudioLoading() {
 return <main id="main-content" className={styles.main} aria-busy="true"><div role="status" className={styles.loadingState}><strong>Opening workspace…</strong><p>Loading your editorial records.</p></div></main>;
}
