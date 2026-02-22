import styles from "./HomePage.module.css";

export default function HomePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mes relations</h1>
      </header>
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 className={styles.emptyTitle}>Aucune relation pour l'instant</h2>
        <p className={styles.emptyText}>
          Invitez quelqu'un en scannant un QR code ou en partageant un lien d'invitation.
        </p>
      </div>
    </div>
  );
}
