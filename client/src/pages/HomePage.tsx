import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./HomePage.module.css";

interface Relationship {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  status: string;
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

export default function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

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
    (r) => r.status === "pending"
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
            Invitez quelqu'un en scannant un QR code ou en partageant un lien
            d'invitation.
          </p>
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
          {pendingRelationships.map((rel) => (
            <div key={rel.id} className={styles.relationCard}>
              <div className={styles.relationAvatar}>
                <div className={styles.avatarPlaceholderPending}>?</div>
              </div>
              <div className={styles.relationInfo}>
                <span className={styles.relationName}>Invitation envoyée</span>
                <span className={styles.relationStatusPending}>
                  En attente de réponse
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
