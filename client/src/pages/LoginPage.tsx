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
              />
              {status === "error" && (
                <p className={styles.error} role="alert" aria-live="assertive">{errorMessage}</p>
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

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>ou</span>
              <span className={styles.dividerLine} />
            </div>

            <div className={styles.socialButtons}>
              <button
                type="button"
                className={styles.googleButton}
                onClick={() => {
                  window.location.href = "/api/auth/google";
                }}
              >
                <svg
                  className={styles.socialIcon}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuer avec Google
              </button>

              <button
                type="button"
                className={styles.facebookButton}
                onClick={() => {
                  window.location.href = "/api/auth/facebook";
                }}
              >
                <svg
                  className={styles.socialIcon}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continuer avec Facebook
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
