import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import styles from "./RelationshipPage.module.css";

interface Relationship {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  status: string;
  partnerName: string | null;
  partnerAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipsResponse {
  success: boolean;
  data: Relationship[];
  count: number;
}

export default function RelationshipPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !isAuthenticated || authLoading) return;

    const fetchRelationship = async () => {
      try {
        // Fetch all relationships and find the matching one
        const response = await api.get<RelationshipsResponse>("/relationships");
        const rel = response.data.find((r) => r.id === id);
        if (rel) {
          setRelationship(rel);
        } else {
          setError("Relation non trouvée.");
        }
      } catch {
        setError("Erreur lors du chargement de la relation.");
      } finally {
        setLoading(false);
      }
    };

    fetchRelationship();
  }, [id, isAuthenticated, authLoading]);

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
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Chargement de la relation...</p>
        </div>
      </div>
    );
  }

  if (error || !relationship) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate("/home")}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className={styles.title}>Relation</h1>
        </header>
        <div className={styles.errorContent}>
          <p className={styles.errorText}>{error || "Relation non trouvée."}</p>
          <button className={styles.primaryButton} onClick={() => navigate("/home")}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate("/home")}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>{relationship.partnerName || "Relation"}</h1>
      </header>

      <div className={styles.profileSection}>
        <div className={styles.avatar}>
          {relationship.partnerAvatarUrl ? (
            <img
              src={relationship.partnerAvatarUrl}
              alt={relationship.partnerName || ""}
              className={styles.avatarImg}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(relationship.partnerName || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className={styles.partnerName}>
          {relationship.partnerName || "Utilisateur"}
        </h2>
        <span className={styles.statusBadge}>
          {relationship.status === "accepted" ? "Relation active" : relationship.status}
        </span>
      </div>

      <div className={styles.placeholder}>
        <p className={styles.placeholderText}>
          Utilisez les onglets ci-dessous pour gérer vos limites.
        </p>
      </div>
    </div>
  );
}
