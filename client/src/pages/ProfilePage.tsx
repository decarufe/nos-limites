import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./ProfilePage.module.css";

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    authProvider: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface DeviceInfo {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastSeen: string;
  revoked: boolean;
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Edit display name state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Devices state
  const [devicesList, setDevicesList] = useState<DeviceInfo[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setDevicesLoading(true);
      api
        .get<{ devices: DeviceInfo[] }>("/devices")
        .then((data) => setDevicesList(data.devices.filter((d) => !d.revoked)))
        .catch(() => { })
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

  const handleStartEdit = () => {
    setEditName(user?.displayName || "");
    setEditError(null);
    setEditSuccess(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName("");
    setEditError(null);
  };

  const handleSaveDisplayName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Le nom d'affichage ne peut pas être vide.");
      return;
    }
    if (trimmed.length < 2) {
      setEditError("Le nom d'affichage doit contenir au moins 2 caractères.");
      return;
    }
    if (trimmed.length > 50) {
      setEditError("Le nom d'affichage ne peut pas dépasser 50 caractères.");
      return;
    }

    setIsSaving(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      const response = await api.put<ProfileResponse>("/profile", {
        displayName: trimmed,
      });

      // Update user in auth context
      updateUser({
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName,
        avatarUrl: response.user.avatarUrl,
      });

      setIsEditing(false);
      setEditSuccess("Nom d'affichage mis à jour avec succès !");

      // Clear success message after 3 seconds
      setTimeout(() => setEditSuccess(null), 3000);
    } catch (err) {
      setEditError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour du profil.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.delete("/profile");
      // Clear local auth state and redirect to login
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression du compte.",
      );
      setIsDeleting(false);
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
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className={styles.text}>
            Connectez-vous pour accéder à votre profil.
          </p>
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
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}

          {/* Display name with edit capability */}
          {isEditing ? (
            <div className={styles.editSection}>
              <input
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setEditError(null);
                }}
                className={styles.editInput}
                placeholder="Votre nom d'affichage"
                maxLength={50}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveDisplayName();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              {editError && <p className={styles.errorText}>{editError}</p>}
              <div className={styles.editButtons}>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveDisplayName}
                  disabled={isSaving}
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.nameRow}>
              <h2 className={styles.displayName}>{user.displayName}</h2>
              <button
                className={styles.editButton}
                onClick={handleStartEdit}
                aria-label="Modifier le nom d'affichage"
                title="Modifier"
              >
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
                  <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </div>
          )}

          {editSuccess && <p className={styles.successText}>{editSuccess}</p>}

          <p className={styles.email}>{user.email}</p>
        </div>

        <div className={styles.actions}>
          {/* Devices section */}
          <div className={styles.devicesSection}>
            <h3 className={styles.devicesSectionTitle}>Appareils connectés</h3>
            {devicesLoading ? (
              <p className={styles.text}>Chargement...</p>
            ) : devicesList.length === 0 ? (
              <p className={styles.text}>Aucun appareil enregistré.</p>
            ) : (
              <ul className={styles.devicesList}>
                {devicesList.map((device) => (
                  <li key={device.id} className={styles.deviceItem}>
                    <div className={styles.deviceInfo}>
                      <span className={styles.deviceName}>
                        {device.deviceName || "Navigateur"}
                      </span>
                      <span className={styles.deviceMeta}>
                        Dernière activité :{" "}
                        {new Date(device.lastSeen).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <button
                      className={styles.deviceRevokeButton}
                      onClick={() => handleRevokeDevice(device.id)}
                      aria-label={`Révoquer l'appareil ${device.deviceName}`}
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
                ))}
              </ul>
            )}
          </div>

          {/* Logout button */}
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

          {/* Delete account button */}
          <button
            className={styles.deleteButton}
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Supprimer mon compte"
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Supprimer mon compte
          </button>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div
            className={styles.modalOverlay}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Supprimer votre compte ?</h3>
              <p className={styles.modalText}>
                Cette action est irréversible. Toutes vos données seront
                supprimées : relations, limites, notifications et informations
                de profil.
              </p>
              {deleteError && <p className={styles.errorText}>{deleteError}</p>}
              <div className={styles.modalButtons}>
                <button
                  className={styles.confirmDeleteButton}
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Suppression..." : "Oui, supprimer mon compte"}
                </button>
                <button
                  className={styles.cancelDeleteButton}
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
