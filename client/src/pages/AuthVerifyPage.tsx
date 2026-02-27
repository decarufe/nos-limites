import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./AuthVerifyPage.module.css";

interface VerifyResponse {
  token: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
  isNewUser: boolean;
  deviceId?: string;
  deviceToken?: string;
}

export default function AuthVerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMessage("Token manquant dans le lien.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get<VerifyResponse>(
          `/auth/verify?token=${token}`,
        );

        // Log in the user with device token for persistent sessions
        login(
          response.token,
          response.user,
          response.deviceId,
          response.deviceToken,
        );
        setStatus("success");

        const pendingRedirect = sessionStorage.getItem(
          "nos_limites_pending_redirect",
        );

        // Redirect based on whether it's a new user
        if (response.isNewUser) {
          // New user - go to profile setup (pending redirect will be consumed after setup)
          navigate("/profile/setup", { replace: true });
        } else {
          // Existing user - go to pending redirect or home
          if (pendingRedirect) {
            sessionStorage.removeItem("nos_limites_pending_redirect");
            navigate(pendingRedirect, { replace: true });
          } else {
            navigate("/home", { replace: true });
          }
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Erreur lors de la vérification du lien magique.",
        );
      }
    };

    verifyToken();
  }, [searchParams, login, navigate]);

  return (
    <div className={styles.container}>
      {status === "verifying" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <h2 className={styles.title}>Vérification en cours...</h2>
          <p className={styles.text}>
            Nous vérifions votre lien magique, un instant.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className={styles.content}>
          <div className={styles.errorIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-error)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Erreur de vérification</h2>
          <p className={styles.text}>{errorMessage}</p>
          <button
            className={styles.button}
            onClick={() => navigate("/login", { replace: true })}
          >
            Retour à la connexion
          </button>
        </div>
      )}
    </div>
  );
}
