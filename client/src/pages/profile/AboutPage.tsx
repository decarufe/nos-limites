import styles from "./AboutPage.module.css";

const WEBSITE_URL = "https://nos-limites.com";

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>À propos</h1>
      </header>
      <div className={styles.content}>
        <div className={styles.logoWrapper}>
          <div className={styles.logo}>💞</div>
        </div>
        <h2 className={styles.appName}>Nos limites</h2>
        <p className={styles.tagline}>
          Définissez vos limites mutuelles en toute confiance.
        </p>
        <p className={styles.description}>
          Nos limites est une application qui permet à deux personnes de définir
          mutuellement et de façon transparente les limites de leur relation.
          Seules les limites acceptées par les deux sont révélées — un système de
          "match" qui encourage l'ouverture tout en protégeant la vulnérabilité
          de chacun.
        </p>
        <a
          href={WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          En savoir plus sur nos-limites.com
        </a>
        <div className={styles.badges}>
          <span className={styles.badge}>🔐 Données chiffrées</span>
          <span className={styles.badge}>🇪🇺 Conforme RGPD</span>
          <span className={styles.badge}>🆓 100% gratuit</span>
        </div>
      </div>
    </div>
  );
}
