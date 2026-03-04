import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./HomePage.module.css";

interface Relationship {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  status: string;
  name: string | null;
  partnerName: string | null;
  partnerAvatarUrl: string | null;
  commonLimitsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipsResponse {
  success: boolean;
  data: Relationship[];
  count: number;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const fetchRelationships = async () => {
      try {
        const response = await api.get<RelationshipsResponse>("/relationships");
        setRelationships(response.data);
      } catch {
        // Silently fail - show empty state
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();
  }, [isAuthenticated, authLoading]);

  const handleDeleteInvitation = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/relationships/${id}`);
      setRelationships((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartRename = (rel: Relationship) => {
    setEditingNameId(rel.id);
    setNameInput(rel.name || "");
  };

  const handleSaveName = async (id: string) => {
    try {
      await api.patch(`/relationships/${id}/name`, { name: nameInput });
      setRelationships((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, name: nameInput.trim() || null } : r
        )
      );
    } catch {
      // Silently fail
    } finally {
      setEditingNameId(null);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Mes relations</h1>
        </header>
        <div className={styles.empty}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const acceptedRelationships = relationships.filter(
    (r) => r.status === "accepted"
  );
  const pendingRelationships = relationships.filter(
    (r) => r.status === "pending" && r.inviterId === user?.id
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mes relations</h1>
      </header>

      {loading ? (
        <div className={styles.empty}>
          <p>Chargement...</p>
        </div>
      ) : acceptedRelationships.length === 0 &&
        pendingRelationships.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 className={styles.emptyTitle}>
            Aucune relation pour l'instant
          </h2>
          <p className={styles.emptyText}>
            Affichez un QR code que votre contact peut scanner, ou partagez
            un lien d'invitation pour l'ajouter à vos relations.
          </p>
          <button
            className={styles.emptyButton}
            onClick={() => navigate("/scan")}
          >
            Créer une invitation
          </button>
        </div>
      ) : (
        <div className={styles.relationsList}>
          {acceptedRelationships.map((rel) => (
            <button
              key={rel.id}
              className={styles.relationCard}
              onClick={() => navigate(`/relationship/${rel.id}`)}
            >
              <div className={styles.relationAvatar}>
                {rel.partnerAvatarUrl ? (
                  <img
                    src={rel.partnerAvatarUrl}
                    alt={rel.partnerName || ""}
                    className={styles.avatarImg}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {(rel.partnerName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.relationInfo}>
                <span className={styles.relationName}>
                  {rel.partnerName || "Utilisateur"}
                </span>
                <span className={styles.relationStatus}>
                  {rel.commonLimitsCount === 0
                    ? "Aucune limite en commun"
                    : rel.commonLimitsCount === 1
                      ? "1 limite en commun"
                      : `${rel.commonLimitsCount} limites en commun`}
                </span>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.chevron}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
          {pendingRelationships.length > 0 && (
            <div className={styles.pendingSection}>
              <h2 className={styles.pendingSectionTitle}>
                Invitations en attente
              </h2>
              {pendingRelationships.map((rel) => (
                <div key={rel.id} className={styles.pendingCard}>
                  <div className={styles.pendingCardTop}>
                    <div className={styles.relationAvatar}>
                      <div className={styles.avatarPlaceholderPending}>?</div>
                    </div>
                    <div className={styles.relationInfo}>
                      {editingNameId === rel.id ? (
                        <input
                          className={styles.nameInput}
                          value={nameInput}
                          autoFocus
                          onChange={(e) => setNameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveName(rel.id);
                            if (e.key === "Escape") setEditingNameId(null);
                          }}
                          onBlur={() => handleSaveName(rel.id)}
                          placeholder="Nommer cette invitation…"
                          maxLength={60}
                        />
                      ) : (
                        <button
                          className={styles.relationNameButton}
                          onClick={() => handleStartRename(rel)}
                          title="Cliquer pour nommer cette invitation"
                        >
                          <span className={styles.relationName}>
                            {rel.name || "Invitation envoyée"}
                          </span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={styles.editIcon}
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                      <span className={styles.relationStatusPending}>
                        En attente · {formatDate(rel.createdAt)}
                      </span>
                    </div>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteInvitation(rel.id)}
                      disabled={deletingId === rel.id}
                      title="Supprimer cette invitation"
                      aria-label="Supprimer cette invitation"
                    >
                      {deletingId === rel.id ? (
                        <span className={styles.deletingSpinner} />
                      ) : (
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
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
