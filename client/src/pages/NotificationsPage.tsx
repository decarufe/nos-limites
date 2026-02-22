import styles from "./NotificationsPage.module.css";

export default function NotificationsPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
      </header>
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h2 className={styles.emptyTitle}>Aucune notification</h2>
        <p className={styles.emptyText}>
          Vous recevrez des notifications lorsque quelqu'un interagira avec vous.
        </p>
      </div>
    </div>
  );
}
