import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./ProfileSetupPage.module.css";

interface ProfileUpdateResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function ProfileSetupPage() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p>Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setErrorMessage("Veuillez entrer votre prénom ou pseudo.");
      setStatus("error");
      return;
    }

    if (trimmedName.length > 50) {
      setErrorMessage("Le nom ne doit pas dépasser 50 caractères.");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setErrorMessage("");

    try {
      const response = await api.put<ProfileUpdateResponse>("/profile", {
        displayName: trimmedName,
      });

      updateUser(response.user);
      const pendingRedirect = sessionStorage.getItem("nos_limites_pending_redirect");
      if (pendingRedirect) {
        sessionStorage.removeItem("nos_limites_pending_redirect");
        navigate(pendingRedirect, { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde du profil."
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.avatar}>
          <span className={styles.avatarInitial}>
            {(displayName || user?.email || "?")[0].toUpperCase()}
          </span>
        </div>

        <h1 className={styles.title}>Bienvenue !</h1>
        <p className={styles.subtitle}>
          Comment souhaitez-vous vous appeler ?
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="displayName">
            Prénom ou pseudo
          </label>
          <input
            id="displayName"
            type="text"
            className={styles.input}
            placeholder="Votre prénom ou pseudo"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={status === "saving"}
            autoFocus
            maxLength={50}
          />
          {status === "error" && (
            <p className={styles.error}>{errorMessage}</p>
          )}
          <button
            type="submit"
            className={styles.button}
            disabled={status === "saving"}
          >
            {status === "saving" ? "Enregistrement..." : "Continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
