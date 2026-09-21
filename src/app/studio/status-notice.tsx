import styles from "./studio.module.css";

const noticeMessages: Record<string, string> = {
  "signal-added": "Signal added to the evidence inbox.",
  "source-added": "Source saved as paused. Review it before activation.",
  "source-activated": "Source activated. It will join the next collection run.",
  "source-paused": "Source paused. Its existing evidence is unchanged.",
  "story-published": "Story published to discovery.",
  "brief-published": "Evidence brief published to discovery.",
  "story-scheduled": "Story scheduled for publication.",
  "candidate-rejected": "Candidate rejected and removed from review.",
  "candidate-expired": "Candidate expired and removed from the current desk.",
  "story-unpublished": "Story unpublished from discovery.",
  "clusters-merged": "Clusters merged into one evidence set.",
  "cluster-split": "Selected evidence moved into a new cluster.",
};

export function StatusNotice({ notice, error }: { notice?: string; error?: string }) {
  if (error) return <div className={styles.errorNotice} role="alert"><strong>Action needed</strong><span>{error}</span></div>;
  const message = notice ? noticeMessages[notice] : undefined;
  if (!message) return null;
  return <div className={styles.successNotice} role="status"><strong>Done</strong><span>{message}</span></div>;
}
