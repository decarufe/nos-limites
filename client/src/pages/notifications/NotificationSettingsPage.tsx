import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import styles from "./NotificationSettingsPage.module.css";

type DigestFrequency = "daily" | "weekly";

interface NotificationSettings {
  digestEnabled: boolean;
  digestFrequency: DigestFrequency;
  digestTime: string;
  digestWeeklyDay: number;
  realtimeEnabled: boolean;
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function NotificationSettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState<NotificationSettings>({
    digestEnabled: true,
    digestFrequency: "daily",
    digestTime: "08:00",
    digestWeeklyDay: 1,
    realtimeEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (isAuthenticated) {
      api
        .get<{ settings: NotificationSettings }>(
          "/profile/notification-settings",
        )
        .then((data) => setSettings(data.settings))
        .catch(() => {
          setErrorMessage("Impossible de charger vos préférences.");
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await api.put<{ settings: NotificationSettings }>(
        "/profile/notification-settings",
        settings,
      );
      setSettings(response.settings);
      setSuccessMessage("Préférences enregistrées avec succès.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde des préférences.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAll = async () => {
    const disabled: NotificationSettings = {
      ...settings,
      digestEnabled: false,
      realtimeEnabled: false,
    };
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await api.put<{ settings: NotificationSettings }>(
        "/profile/notification-settings",
        disabled,
      );
      setSettings(response.settings);
      setSuccessMessage("Tous les emails de notification ont été désactivés.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde des préférences.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>Chargement...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
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
        <h1 className={styles.title}>Notifications par email</h1>
        <p className={styles.subtitle}>
          Gérez la fréquence et le type d&apos;emails que vous recevez de Nos
          limites.
        </p>
      </div>

      {/* Unsubscribe banner (shown when coming from an email) */}
      <div className={styles.infoBanner}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Pour vous désabonner de tous les emails, désactivez les deux options
          ci-dessous et enregistrez.
        </span>
      </div>

      <div className={styles.card}>
        {/* Realtime toggle */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Alertes en temps réel</span>
            <p className={styles.hint}>
              Recevez un email lorsqu&apos;un contact fait un changement
              important (nouvelle demande, limite modifiée, etc.).
            </p>
          </div>
          <label className={styles.toggle} aria-label="Alertes en temps réel">
            <input
              type="checkbox"
              checked={settings.realtimeEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  realtimeEnabled: e.target.checked,
                }))
              }
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>

        <div className={styles.divider} />

        {/* Digest toggle */}
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <span className={styles.toggleLabel}>Résumé périodique</span>
            <p className={styles.hint}>
              Recevez un résumé de votre activité et des notifications non lues.
            </p>
          </div>
          <label className={styles.toggle} aria-label="Résumé périodique">
            <input
              type="checkbox"
              checked={settings.digestEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  digestEnabled: e.target.checked,
                }))
              }
            />
            <span className={styles.toggleSlider} />
          </label>
        </div>

        {/* Digest config fields */}
        {settings.digestEnabled && (
          <div className={styles.digestFields}>
            <div className={styles.field}>
              <label htmlFor="digest-frequency" className={styles.fieldLabel}>
                Fréquence
              </label>
              <select
                id="digest-frequency"
                className={styles.select}
                value={settings.digestFrequency}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    digestFrequency: e.target.value as DigestFrequency,
                  }))
                }
              >
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="digest-time" className={styles.fieldLabel}>
                Heure d&apos;envoi
              </label>
              <input
                id="digest-time"
                type="time"
                className={styles.input}
                value={settings.digestTime}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    digestTime: e.target.value,
                  }))
                }
              />
            </div>

            {settings.digestFrequency === "weekly" && (
              <div className={styles.field}>
                <label htmlFor="digest-weekday" className={styles.fieldLabel}>
                  Jour de la semaine
                </label>
                <select
                  id="digest-weekday"
                  className={styles.select}
                  value={settings.digestWeeklyDay}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      digestWeeklyDay: parseInt(e.target.value),
                    }))
                  }
                >
                  {DAY_LABELS.map((label, idx) => (
                    <option key={idx} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback messages */}
      {successMessage && <p className={styles.successText}>{successMessage}</p>}
      {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.saveButton}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer les préférences"}
        </button>

        <button
          className={styles.unsubscribeButton}
          onClick={handleDisableAll}
          disabled={
            saving || (!settings.digestEnabled && !settings.realtimeEnabled)
          }
        >
          Me désabonner de tous les emails
        </button>
      </div>
    </div>
  );
}
