import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import styles from "./HomePage.module.css";

interface Relationship {
  id: string;
  inviterId: string;
  inviteeId: string | null;
  status: string;
  name: string | null;
  invitationToken?: string;
  activeCategories: string[] | null;
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

const CATEGORY_ICONS: Record<string, string> = {
  "Contact professionnel": "🤝",
  "Contact amical": "😊",
  "Flirt et séduction": "💬",
  "Contact rapproché": "🤗",
  "Intimité": "💕",
};

const ALL_CATEGORIES = [
  "Contact professionnel",
  "Contact amical",
  "Flirt et séduction",
  "Contact rapproché",
  "Intimité",
];

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
  const [shareModalRel, setShareModalRel] = useState<Relationship | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingCategoriesId, setEditingCategoriesId] = useState<string | null>(null);
  const [categoriesInput, setCategoriesInput] = useState<string[]>([]);
  const [categoriesSaveError, setCategoriesSaveError] = useState(false);

  useEffect(() => {
    if (shareModalRel) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [shareModalRel]);

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

  const handleOpenShare = (rel: Relationship) => {
    setShareModalRel(rel);
    setCopied(false);
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleStartEditCategories = (rel: Relationship) => {
    setEditingCategoriesId(rel.id);
    setCategoriesInput(rel.activeCategories || []);
  };

  const handleToggleCategory = (cat: string) => {
    setCategoriesInput((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSaveCategories = async (id: string) => {
    if (categoriesInput.length === 0) return;
    setCategoriesSaveError(false);
    try {
      await api.patch(`/relationships/${id}/categories`, {
        activeCategories: categoriesInput,
      });
      setRelationships((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, activeCategories: categoriesInput } : r
        )
      );
      if (shareModalRel?.id === id) {
        setShareModalRel((prev) =>
          prev ? { ...prev, activeCategories: categoriesInput } : prev
        );
      }
      setEditingCategoriesId(null);
    } catch {
      setCategoriesSaveError(true);
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
  const myInvitations = relationships.filter(
    (r) =>
      (r.status === "pending" || r.status === "declined") &&
      r.inviterId === user?.id
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
        myInvitations.length === 0 ? (
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
          {myInvitations.length > 0 && (
            <div className={styles.pendingSection}>
              <h2 className={styles.pendingSectionTitle}>
                Mes invitations
              </h2>
              {myInvitations.map((rel) => (
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
                      ) : rel.status === "pending" ? (
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
                      ) : (
                        <span className={styles.relationName}>
                          {rel.name || "Invitation envoyée"}
                        </span>
                      )}
                      <span className={rel.status === "declined" ? styles.relationStatusDeclined : styles.relationStatusPending}>
                        {rel.status === "declined"
                          ? `Refusée · ${formatDate(rel.createdAt)}`
                          : `En attente · ${formatDate(rel.createdAt)}`}
                      </span>
                    </div>
                    <div className={styles.pendingCardActions}>
                      {rel.invitationToken && rel.status === "pending" && (
                        <button
                          className={styles.shareButton}
                          onClick={() => handleOpenShare(rel)}
                          title="Voir le QR code et le lien d'invitation"
                          aria-label="Partager cette invitation"
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
                          >
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                      )}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share / QR modal */}
      {shareModalRel && shareModalRel.invitationToken && (
        <div className={styles.modalOverlay} onClick={() => setShareModalRel(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {shareModalRel.name || "Invitation"}
              </h2>
              <button
                className={styles.modalClose}
                onClick={() => setShareModalRel(null)}
                aria-label="Fermer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.qrContainer}>
              <QRCodeSVG
                value={`${window.location.origin}/invite/${shareModalRel.invitationToken}`}
                size={180}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#1C1917"
                includeMargin
              />
            </div>

            <button
              className={styles.copyLinkButton}
              onClick={() => handleCopyLink(shareModalRel.invitationToken!)}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Lien copié !
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copier le lien
                </>
              )}
            </button>

            <div className={styles.modalCategories}>
              <div className={styles.modalCategoriesHeader}>
                <span className={styles.modalCategoriesTitle}>Sections activées</span>
                {editingCategoriesId !== shareModalRel.id && (
                  <button
                    className={styles.editCategoriesButton}
                    onClick={() => handleStartEditCategories(shareModalRel)}
                  >
                    Modifier
                  </button>
                )}
              </div>
              {editingCategoriesId === shareModalRel.id ? (
                <div className={styles.categoriesEditList}>
                  {ALL_CATEGORIES.map((cat) => (
                    <label key={cat} className={styles.categoryCheckItem}>
                      <input
                        type="checkbox"
                        checked={categoriesInput.includes(cat)}
                        onChange={() => handleToggleCategory(cat)}
                      />
                      <span>{CATEGORY_ICONS[cat]}</span>
                      <span>{cat}</span>
                    </label>
                  ))}
                  <div className={styles.categoriesEditActions}>
                    <button
                      className={styles.saveButton}
                      onClick={() => handleSaveCategories(shareModalRel.id)}
                      disabled={categoriesInput.length === 0}
                    >
                      Enregistrer
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => { setEditingCategoriesId(null); setCategoriesSaveError(false); }}
                    >
                      Annuler
                    </button>
                  </div>
                  {categoriesSaveError && (
                    <p className={styles.categoriesSaveError}>
                      Erreur lors de la sauvegarde. Veuillez réessayer.
                    </p>
                  )}
                </div>
              ) : (
                <div className={styles.categoriesBadgeList}>
                  {(shareModalRel.activeCategories || []).map((cat) => (
                    <span key={cat} className={styles.categoryBadge}>
                      {CATEGORY_ICONS[cat] ?? "📌"} {cat}
                    </span>
                  ))}
                  {(!shareModalRel.activeCategories || shareModalRel.activeCategories.length === 0) && (
                    <span className={styles.noCategoriesText}>Aucune section sélectionnée</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
