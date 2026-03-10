import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PreferencesPage.module.css";

type ThemePreference = "system" | "light" | "dark";
type LanguagePreference = "fr" | "en";

const THEME_KEY = "nos_limites_theme";
const LANG_KEY = "nos_limites_lang";

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export default function PreferencesPage() {
  const navigate = useNavigate();

  const [theme, setTheme] = useState<ThemePreference>(() => {
    return (localStorage.getItem(THEME_KEY) as ThemePreference) || "system";
  });

  const [language, setLanguage] = useState<LanguagePreference>(() => {
    return (localStorage.getItem(LANG_KEY) as LanguagePreference) || "fr";
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: ThemePreference) => {
    setTheme(newTheme);
    setSaved(false);
  };

  const handleLanguageChange = (newLang: LanguagePreference) => {
    setLanguage(newLang);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.setItem(LANG_KEY, language);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(-1)}
          aria-label="Retour"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Retour
        </button>
        <h1 className={styles.title}>Préférences</h1>
      </div>

      {/* Language section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Langue de l&apos;application</h2>
        <div className={styles.optionGroup} role="radiogroup" aria-label="Langue">
          <label className={`${styles.option} ${language === "fr" ? styles.optionSelected : ""}`}>
            <input
              type="radio"
              name="language"
              value="fr"
              checked={language === "fr"}
              onChange={() => handleLanguageChange("fr")}
              className={styles.radioInput}
            />
            <span className={styles.optionLabel}>
              <span className={styles.optionEmoji}>🇫🇷</span>
              Français
            </span>
            {language === "fr" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.checkIcon}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </label>
          <label className={`${styles.option} ${language === "en" ? styles.optionSelected : ""}`}>
            <input
              type="radio"
              name="language"
              value="en"
              checked={language === "en"}
              onChange={() => handleLanguageChange("en")}
              className={styles.radioInput}
            />
            <span className={styles.optionLabel}>
              <span className={styles.optionEmoji}>🇬🇧</span>
              English
            </span>
            {language === "en" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.checkIcon}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </label>
        </div>
      </div>

      {/* Theme section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Thème</h2>
        <div className={styles.optionGroup} role="radiogroup" aria-label="Thème">
          <label className={`${styles.option} ${theme === "system" ? styles.optionSelected : ""}`}>
            <input
              type="radio"
              name="theme"
              value="system"
              checked={theme === "system"}
              onChange={() => handleThemeChange("system")}
              className={styles.radioInput}
            />
            <span className={styles.optionLabel}>
              <span className={styles.optionEmoji}>⚙️</span>
              Système
            </span>
            {theme === "system" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.checkIcon}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </label>
          <label className={`${styles.option} ${theme === "light" ? styles.optionSelected : ""}`}>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => handleThemeChange("light")}
              className={styles.radioInput}
            />
            <span className={styles.optionLabel}>
              <span className={styles.optionEmoji}>☀️</span>
              Clair
            </span>
            {theme === "light" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.checkIcon}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </label>
          <label className={`${styles.option} ${theme === "dark" ? styles.optionSelected : ""}`}>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => handleThemeChange("dark")}
              className={styles.radioInput}
            />
            <span className={styles.optionLabel}>
              <span className={styles.optionEmoji}>🌙</span>
              Sombre
            </span>
            {theme === "dark" && (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={styles.checkIcon}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </label>
        </div>
      </div>

      {saved && <p className={styles.successText}>Préférences enregistrées.</p>}

      <button className={styles.saveButton} onClick={handleSave}>
        Enregistrer les préférences
      </button>
    </div>
  );
}
