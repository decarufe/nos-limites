import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import styles from "./AboutPage.module.css";

const WEBSITE_URL = "https://nos-limites.com";

interface DeviceInfo {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastSeen: string;
  revoked: boolean;
}

export default function AboutPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [devicesList, setDevicesList] = useState<DeviceInfo[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setDevicesLoading(true);
      api
        .get<{ devices: DeviceInfo[] }>("/devices")
        .then((data) => setDevicesList(data.devices.filter((d) => !d.revoked)))
        .catch(() => {})
        .finally(() => setDevicesLoading(false));
    }
  }, [isAuthenticated]);

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await api.delete(`/devices/${deviceId}`);
      setDevicesList((prev) => prev.filter((d) => d.id !== deviceId));
    } catch {
      // silently fail
    }
  };

  return (
    <div className={styles.container}>
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
        <h1 className={styles.title}>À propos</h1>
      </div>

      <div className={styles.appSection}>
        <div className={styles.logoWrapper}>
          <div className={styles.logo}>💞</div>
        </div>
        <h2 className={styles.appName}>Nos limites</h2>
        <p className={styles.tagline}>
          Définissez vos limites mutuelles en toute confiance.
        </p>
        <p className={styles.description}>
          Nos limites est une application qui permet à deux personnes de définir
          mutuellement et de façon transparente les limites de leur relation.
          Seules les limites acceptées par les deux sont révélées — un système de
          "match" qui encourage l'ouverture tout en protégeant la vulnérabilité
          de chacun.
        </p>
        <a
          href={WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.websiteLink}
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
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          En savoir plus sur nos-limites.com
        </a>
        <div className={styles.badges}>
          <span className={styles.badge}>🔐 Données chiffrées</span>
          <span className={styles.badge}>🇪🇺 Conforme RGPD</span>
          <span className={styles.badge}>🆓 100% gratuit</span>
        </div>
      </div>

      {/* Connected devices section */}
      {isAuthenticated && (
        <div className={styles.devicesSection}>
          <h3 className={styles.devicesSectionTitle}>Appareils connectés</h3>
          {devicesLoading ? (
            <p className={styles.loadingText}>Chargement...</p>
          ) : devicesList.length === 0 ? (
            <p className={styles.emptyText}>Aucun appareil enregistré.</p>
          ) : (
            <ul className={styles.devicesList}>
              {devicesList.map((device) => {
                const displayName = device.deviceName || "Navigateur";
                return (
                  <li key={device.id} className={styles.deviceItem}>
                    <div className={styles.deviceInfo}>
                      <span className={styles.deviceName}>
                        {displayName}
                      </span>
                      <span className={styles.deviceMeta}>
                        Dernière activité :{" "}
                        {new Date(device.lastSeen).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <button
                      className={styles.deviceRevokeButton}
                      onClick={() => handleRevokeDevice(device.id)}
                      aria-label={`Révoquer l'appareil ${displayName}`}
                      title="Révoquer"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
