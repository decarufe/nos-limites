import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, API_BASE_URL } from "../services/api";
import styles from "./LoginPage.module.css";

/** Map OAuth error codes (from query params) to user-friendly French messages */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Connexion annulée. Vous avez refusé l'accès Google.",
  facebook_denied: "Connexion annulée. Vous avez refusé l'accès Facebook.",
  missing_code: "Erreur de connexion Google. Code d'autorisation manquant.",
  missing_state: "Erreur de sécurité, veuillez réessayer.",
  invalid_state: "Erreur de sécurité, veuillez réessayer.",
  state_expired: "La session a expiré, veuillez réessayer.",
  token_exchange_failed: "Erreur de connexion Google, veuillez réessayer.",
  no_id_token: "Erreur de connexion Google, veuillez réessayer.",
  token_verification_failed:
    "Erreur de vérification du compte Google, veuillez réessayer.",
  invalid_token_payload: "Erreur de connexion Google, veuillez réessayer.",
  invalid_issuer:
    "Erreur de vérification du compte Google, veuillez réessayer.",
  invalid_audience:
    "Erreur de vérification du compte Google, veuillez réessayer.",
  email_not_verified:
    "Votre adresse email Google n'est pas vérifiée. Veuillez vérifier votre email Google et réessayer.",
  missing_user_info:
    "Impossible de récupérer vos informations Google. Veuillez réessayer.",
  user_creation_failed:
    "Erreur lors de la création du compte. Veuillez réessayer.",
  oauth_error:
    "Une erreur inattendue est survenue lors de la connexion Google. Veuillez réessayer.",
};

interface ProvidersResponse {
  providers: {
    magic_link: boolean;
    google: boolean;
    facebook: boolean;
  };
}

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [facebookAvailable, setFacebookAvailable] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Check for OAuth error query parameter on mount
  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      const message =
        OAUTH_ERROR_MESSAGES[errorCode] ||
        "Une erreur est survenue lors de la connexion. Veuillez réessayer.";
      setOauthError(message);
      // Clean up the URL to remove error param from browser history
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch available auth providers on mount
  useEffect(() => {
    api
      .get<ProvidersResponse>("/auth/providers")
      .then((data) => {
        setGoogleAvailable(data.providers.google);
        setFacebookAvailable(data.providers.facebook);
      })
      .catch(() => {
        // If providers endpoint fails, hide social buttons
        setGoogleAvailable(false);
        setFacebookAvailable(false);
      });
  }, []);

  // If already authenticated, redirect to pending destination or home
  if (isAuthenticated) {
    const pendingRedirect = sessionStorage.getItem(
      "nos_limites_pending_redirect",
    );
    if (pendingRedirect) {
      sessionStorage.removeItem("nos_limites_pending_redirect");
      return <Navigate to={pendingRedirect} replace />;
    }
    return <Navigate to="/home" replace />;
  }

  if (isLoading) {
    return (
      <div
        className={styles.container}
        role="status"
        aria-label="Chargement en cours"
      >
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
          : "Erreur lors de l'envoi du lien magique.",
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
        <h1 className={styles.title} id="login-heading">
          Nos limites
        </h1>
        <p className={styles.subtitle}>
          Définissez vos limites mutuelles en toute confiance
        </p>
      </div>

      {oauthError && (
        <div
          className={styles.oauthErrorBanner}
          role="alert"
          aria-live="assertive"
          data-testid="oauth-error"
        >
          <p className={styles.oauthErrorText}>{oauthError}</p>
          <button
            type="button"
            className={styles.oauthErrorClose}
            onClick={() => setOauthError(null)}
            aria-label="Fermer le message d'erreur"
          >
            &times;
          </button>
        </div>
      )}

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
                aria-describedby={
                  status === "error" ? "email-error" : undefined
                }
              />
              {status === "error" && (
                <p
                  id="email-error"
                  className={styles.error}
                  role="alert"
                  aria-live="assertive"
                >
                  {errorMessage}
                </p>
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

            {(googleAvailable || facebookAvailable) && (
              <>
                <div className={styles.divider}>
                  <span className={styles.dividerLine} />
                  <span className={styles.dividerText}>ou</span>
                  <span className={styles.dividerLine} />
                </div>

                <div className={styles.socialButtons}>
                  {googleAvailable && (
                    <button
                      type="button"
                      className={styles.googleButton}
                      aria-label="Se connecter avec Google"
                      onClick={() => {
                        window.location.href = `${API_BASE_URL}/auth/google`;
                      }}
                    >
                      Continuer avec Google
                    </button>
                  )}
                  {facebookAvailable && (
                    <button
                      type="button"
                      className={styles.facebookButton}
                      aria-label="Se connecter avec Facebook"
                      onClick={() => {
                        window.location.href = `${API_BASE_URL}/auth/facebook`;
                      }}
                    >
                      Continuer avec Facebook
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
