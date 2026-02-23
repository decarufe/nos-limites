import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";

/**
 * OAuthCallbackPage handles the redirect from the backend after a successful
 * Google OAuth flow. The backend redirects here with auth data as a URL
 * query parameter. This page parses the data, stores it in the auth context,
 * and redirects the user to the appropriate page.
 */
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = searchParams.get("data");

    if (!data) {
      setError("Aucune donnée d'authentification reçue.");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
      return;
    }

    try {
      const authData = JSON.parse(decodeURIComponent(data));

      if (!authData.token || !authData.user) {
        throw new Error("Données d'authentification incomplètes.");
      }

      // Store auth data in context (same as magic link flow)
      login(
        authData.token,
        authData.user,
        authData.deviceId,
        authData.deviceToken
      );

      // Redirect based on whether this is a new user
      if (authData.isNewUser) {
        navigate("/profile/setup", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      console.error("Error parsing OAuth callback data:", err);
      setError("Erreur lors de la connexion. Veuillez réessayer.");
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    }
  }, [searchParams, navigate, login]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.hero}>
          <p style={{ color: "var(--color-error, #e53e3e)" }}>{error}</p>
          <p>Redirection vers la page de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>Connexion en cours...</p>
      </div>
    </div>
  );
}
