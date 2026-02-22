import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./ProfilePage.module.css";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      // Even if the API call fails, logout() clears local state
      // so we still navigate to login
      navigate("/login", { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Profil</h1>
        </header>
        <div className={styles.content}>
          <p className={styles.text}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Profil</h1>
        </header>
        <div className={styles.content}>
          <div className={styles.avatar}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className={styles.text}>Connectez-vous pour accéder à votre profil.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Profil</h1>
      </header>
      <div className={styles.content}>
        <div className={styles.profileSection}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`Photo de profil de ${user.displayName}`}
              className={styles.avatarImage}
            />
          ) : (
            <div className={styles.avatar}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <h2 className={styles.displayName}>{user.displayName}</h2>
          <p className={styles.email}>{user.email}</p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Se déconnecter"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {isLoggingOut ? "Déconnexion..." : "Déconnexion"}
          </button>
        </div>
      </div>
    </div>
  );
}
