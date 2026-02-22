import styles from "./LoginPage.module.css";

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h1 className={styles.title}>Nos limites</h1>
        <p className={styles.subtitle}>
          Définissez vos limites mutuelles en toute confiance
        </p>
      </div>
      <div className={styles.form}>
        <p className={styles.instruction}>
          Connectez-vous pour commencer
        </p>
      </div>
    </div>
  );
}
