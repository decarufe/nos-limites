import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./InvitePage.module.css";

interface InviteDetails {
  id: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  status: string;
  createdAt: string;
}

interface InviteResponse {
  success: boolean;
  data: InviteDetails;
}

interface AcceptResponse {
  success: boolean;
  data: {
    relationshipId: string;
    status: string;
  };
  message: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [status, setStatus] = useState<
    "loading" | "loaded" | "accepting" | "accepted" | "declining" | "declined" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isOwnInvitation, setIsOwnInvitation] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    if (!token || !isAuthenticated || authLoading) return;

    const fetchInvite = async () => {
      try {
        const response = await api.get<InviteResponse>(
          `/relationships/invite/${token}`
        );
        setInvite(response.data);
        setStatus("loaded");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur inconnue";
        setErrorMessage(message);
        // Check for specific error types
        if (message.includes("propre invitation")) {
          setIsOwnInvitation(true);
        }
        if (message.includes("déjà été acceptée")) {
          setAlreadyAccepted(true);
        }
        setStatus("error");
      }
    };

    fetchInvite();
  }, [token, isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the invite URL to come back after
    return <Navigate to="/login" replace />;
  }

  const handleAccept = async () => {
    if (!token || status !== "loaded") return; // Prevent double-click
    setStatus("accepting");

    try {
      await api.post<AcceptResponse>(`/relationships/accept/${token}`);
      setStatus("accepted");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'acceptation de l'invitation."
      );
      setStatus("error");
    }
  };

  const handleDecline = async () => {
    if (!token || status !== "loaded") return; // Prevent double-click
    setStatus("declining");

    try {
      await api.post(`/relationships/decline/${token}`);
      setStatus("declined");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors du refus de l'invitation."
      );
      setStatus("error");
    }
  };

  const handleGoToRelations = () => {
    navigate("/home");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Invitation</h1>
      </header>

      {status === "loading" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Chargement de l'invitation...</p>
        </div>
      )}

      {status === "loaded" && invite && (
        <div className={styles.content}>
          <div className={styles.avatarSection}>
            {invite.inviterAvatarUrl ? (
              <img
                src={invite.inviterAvatarUrl}
                alt={invite.inviterName}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {invite.inviterName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className={styles.inviterName}>{invite.inviterName}</h2>
          <p className={styles.text}>
            vous invite à définir vos limites mutuelles.
          </p>
          <div className={styles.actions}>
            <button
              className={styles.acceptButton}
              onClick={handleAccept}
              disabled={status !== "loaded"}
            >
              Accepter
            </button>
            <button
              className={styles.declineButton}
              onClick={handleDecline}
              disabled={status !== "loaded"}
            >
              Refuser
            </button>
          </div>
        </div>
      )}

      {status === "accepting" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Acceptation en cours...</p>
        </div>
      )}

      {status === "declining" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Refus en cours...</p>
        </div>
      )}

      {status === "declined" && (
        <div className={styles.content}>
          <div className={styles.successIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-secondary, #78716c)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Invitation refusée</h2>
          <p className={styles.text}>
            L'invitation a été refusée. Vous ne recevrez plus de notifications
            de cette personne.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleGoToRelations}
          >
            Retour à l'accueil
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className={styles.content}>
          <div className={styles.successIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Invitation acceptée !</h2>
          <p className={styles.text}>
            Vous pouvez maintenant définir vos limites avec cette personne.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleGoToRelations}
          >
            Voir mes relations
          </button>
        </div>
      )}

      {status === "error" && (
        <div className={styles.content}>
          <div className={styles.errorIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-error, #dc2626)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className={styles.errorText}>{errorMessage}</p>
          {isOwnInvitation && (
            <p className={styles.hintText}>
              Partagez ce lien avec une autre personne pour l'inviter.
            </p>
          )}
          {alreadyAccepted && (
            <p className={styles.hintText}>
              Cette invitation a déjà été utilisée.
            </p>
          )}
          <button
            className={styles.primaryButton}
            onClick={() => navigate("/home")}
          >
            Retour à l'accueil
          </button>
        </div>
      )}
    </div>
  );
}
