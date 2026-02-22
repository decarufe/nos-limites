import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  if (isLoading) {
    return (
      <div className={styles.container} role="status" aria-label="Chargement en cours">
        <div className={styles.hero}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  const validateEmail = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Veuillez entrer votre adresse email.";
    }
    // Validate email format: must have characters before @, after @, and a dot in the domain part
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return "Format d'adresse email invalide. Veuillez vérifier votre saisie.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");
    setDevLink(null);

    try {
      const response = await api.post<{
        message: string;
        token?: string;
        url?: string;
      }>("/auth/magic-link", {
        email: email.trim(),
      });

      setStatus("sent");

      // In dev mode, show the link directly
      if (response.url) {
        setDevLink(response.url);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'envoi du lien magique."
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h1 className={styles.title} id="login-heading">Nos limites</h1>
        <p className={styles.subtitle}>
          Définissez vos limites mutuelles en toute confiance
        </p>
      </div>

      <div className={styles.form}>
        {status === "sent" ? (
          <div className={styles.successBox} role="status" aria-live="polite">
            <div className={styles.successIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className={styles.successTitle}>Lien magique envoyé !</h2>
            <p className={styles.successText}>
              Vérifiez votre boîte mail pour <strong>{email}</strong> et cliquez
              sur le lien pour vous connecter.
            </p>
            {devLink && (
              <div className={styles.devLink}>
                <p className={styles.devLinkLabel}>
                  Mode développement - lien direct :
                </p>
                <a href={devLink} className={styles.devLinkUrl}>
                  Cliquer ici pour se connecter
                </a>
              </div>
            )}
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setStatus("idle");
                setDevLink(null);
              }}
            >
              Renvoyer le lien
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} aria-labelledby="login-heading">
              <label className={styles.label} htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                type="text"
                inputMode="email"
                className={styles.input}
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear error when user starts typing again
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMessage("");
                  }
                }}
                disabled={status === "sending"}
                autoComplete="email"
                autoFocus
                aria-required="true"
                aria-invalid={status === "error" ? "true" : undefined}
                aria-describedby={status === "error" ? "email-error" : undefined}
              />
              {status === "error" && (
                <p id="email-error" className={styles.error} role="alert" aria-live="assertive">{errorMessage}</p>
              )}
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={status === "sending"}
              >
                {status === "sending"
                  ? "Envoi en cours..."
                  : "Envoyer le lien magique"}
              </button>
            </form>

            {/* OAuth social buttons disabled for now
            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>ou</span>
              <span className={styles.dividerLine} />
            </div>

            <div className={styles.socialButtons}>
              <button
                type="button"
                className={styles.googleButton}
                aria-label="Se connecter avec Google"
                onClick={() => {
                  window.location.href = "/api/auth/google";
                }}
              >
                Continuer avec Google
              </button>

              <button
                type="button"
                className={styles.facebookButton}
                aria-label="Se connecter avec Facebook"
                onClick={() => {
                  window.location.href = "/api/auth/facebook";
                }}
              >
                Continuer avec Facebook
              </button>
            </div>
            */}
          </>
        )}
      </div>
    </div>
  );
}
