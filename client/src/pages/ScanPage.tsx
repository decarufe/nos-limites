import { useState } from "react";
import { Navigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./ScanPage.module.css";

interface InviteResponse {
  success: boolean;
  data: {
    id: string;
    invitationToken: string;
    inviteUrl: string;
  };
  message: string;
}

export default function ScanPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "generating" | "generated" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  if (isLoading) {
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
    return <Navigate to="/login" replace />;
  }

  const handleGenerateInvitation = async () => {
    setStatus("generating");
    setErrorMessage("");
    setCopied(false);

    try {
      const response = await api.post<InviteResponse>(
        "/relationships/invite"
      );

      setInviteUrl(response.data.inviteUrl);
      setInviteToken(response.data.invitationToken);
      setStatus("generated");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de la creation de l'invitation."
      );
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNewInvitation = () => {
    setInviteUrl(null);
    setInviteToken(null);
    setStatus("idle");
    setErrorMessage("");
    setCopied(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Inviter</h1>
      </header>

      {status === "idle" && (
        <div className={styles.content}>
          <div className={styles.icon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <p className={styles.text}>
            Affichez un QR code que votre contact peut scanner pour rejoindre
            votre liste de relations, ou partagez un lien d'invitation.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleGenerateInvitation}
          >
            Generer une invitation
          </button>
        </div>
      )}

      {status === "generating" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Creation de l'invitation...</p>
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
          <p className={styles.errorText}>{errorMessage}</p>
          <button
            className={styles.primaryButton}
            onClick={handleGenerateInvitation}
          >
            Reessayer
          </button>
        </div>
      )}

      {status === "generated" && inviteUrl && (
        <div className={styles.inviteContent}>
          <div className={styles.qrSection}>
            <p className={styles.qrLabel}>
              Votre relation scanne ce QR code pour s'ajouter à votre liste :
            </p>
            <div className={styles.qrContainer}>
              <QRCodeSVG
                value={inviteUrl}
                size={200}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1C1917"
                includeMargin
              />
            </div>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>ou</span>
          </div>

          <div className={styles.linkSection}>
            <p className={styles.linkLabel}>Partagez ce lien :</p>
            <div className={styles.linkBox}>
              <span className={styles.linkText} title={inviteUrl}>
                {inviteUrl}
              </span>
            </div>
            {inviteToken && (
              <p className={styles.tokenInfo}>
                Token : <code>{inviteToken}</code>
              </p>
            )}
            <button className={styles.copyButton} onClick={handleCopyLink}>
              {copied ? (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Lien copie !
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copier le lien
                </>
              )}
            </button>
          </div>

          <button
            className={styles.secondaryButton}
            onClick={handleNewInvitation}
          >
            Nouvelle invitation
          </button>
        </div>
      )}
    </div>
  );
}
