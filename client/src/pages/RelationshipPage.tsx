import { useState, useEffect, useCallback } from "react";
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

interface Limit {
  id: string;
  subcategoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  limits: Limit[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  subcategories: Subcategory[];
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
  count: number;
}

interface UserLimit {
  id: string;
  userId: string;
  relationshipId: string;
  limitId: string;
  isAccepted: boolean;
  note: string | null;
}

interface UserLimitsResponse {
  success: boolean;
  data: {
    relationshipId: string;
    limits: UserLimit[];
  };
}

interface CommonLimit {
  id: string;
  name: string;
  description: string | null;
  subcategoryId: string;
}

interface CommonLimitsResponse {
  success: boolean;
  data: {
    relationshipId: string;
    commonLimits: CommonLimit[];
    count: number;
  };
}

type Tab = "mes-limites" | "en-commun";

export default function RelationshipPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("mes-limites");

  // Limits data
  const [categories, setCategories] = useState<Category[]>([]);
  const [checkedLimits, setCheckedLimits] = useState<Set<string>>(new Set());
  const [limitNotes, setLimitNotes] = useState<Map<string, string>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Note editing
  const [editingNoteForLimit, setEditingNoteForLimit] = useState<string | null>(
    null
  );
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);

  // Common limits
  const [commonLimits, setCommonLimits] = useState<CommonLimit[]>([]);
  const [commonLoading, setCommonLoading] = useState(false);

  // Delete relationship
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Block user
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Fetch relationship
  useEffect(() => {
    if (!id || !isAuthenticated || authLoading) return;

    const fetchRelationship = async () => {
      try {
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

  // Fetch categories + user's limits for this relationship
  const fetchLimitsData = useCallback(async () => {
    if (!id) return;
    setLimitsLoading(true);
    try {
      const [catRes, limRes] = await Promise.all([
        api.get<CategoriesResponse>("/limits/categories"),
        api.get<UserLimitsResponse>(`/relationships/${id}/limits`),
      ]);
      setCategories(catRes.data);

      // Build set of accepted limit IDs and map of notes
      const accepted = new Set<string>();
      const notes = new Map<string, string>();
      for (const ul of limRes.data.limits) {
        if (ul.isAccepted) {
          accepted.add(ul.limitId);
        }
        if (ul.note) {
          notes.set(ul.limitId, ul.note);
        }
      }
      setCheckedLimits(accepted);
      setLimitNotes(notes);
    } catch {
      // Silently fail - categories may not be loaded
    } finally {
      setLimitsLoading(false);
    }
  }, [id]);

  // Fetch common limits
  const fetchCommonLimits = useCallback(async () => {
    if (!id) return;
    setCommonLoading(true);
    try {
      const res = await api.get<CommonLimitsResponse>(
        `/relationships/${id}/common-limits`
      );
      setCommonLimits(res.data.commonLimits);
    } catch {
      // Silently fail
    } finally {
      setCommonLoading(false);
    }
  }, [id]);

  // Load data when tab changes
  useEffect(() => {
    if (!relationship) return;
    if (activeTab === "mes-limites" && categories.length === 0) {
      fetchLimitsData();
    } else if (activeTab === "en-commun") {
      fetchCommonLimits();
    }
  }, [
    activeTab,
    relationship,
    categories.length,
    fetchLimitsData,
    fetchCommonLimits,
  ]);

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleLimit = async (limitId: string) => {
    if (!id || saving) return;

    const newChecked = new Set(checkedLimits);
    const isAccepted = !newChecked.has(limitId);

    // Optimistic update
    if (isAccepted) {
      newChecked.add(limitId);
    } else {
      newChecked.delete(limitId);
    }
    setCheckedLimits(newChecked);

    // Save to backend
    setSaving(true);
    setSaveError("");
    try {
      await api.put(`/relationships/${id}/limits`, {
        limits: [{ limitId, isAccepted }],
      });
    } catch (err) {
      console.error("Error toggling limit:", err);
      // Revert on failure
      const reverted = new Set(checkedLimits);
      setCheckedLimits(reverted);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour de la limite."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (categoryId: string, checkAll: boolean) => {
    if (!id || saving) return;

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    // Collect all limit IDs in this category
    const limitIds: string[] = [];
    for (const subcategory of category.subcategories) {
      for (const limit of subcategory.limits) {
        limitIds.push(limit.id);
      }
    }

    // Optimistic update
    const newChecked = new Set(checkedLimits);
    if (checkAll) {
      limitIds.forEach((limitId) => newChecked.add(limitId));
    } else {
      limitIds.forEach((limitId) => newChecked.delete(limitId));
    }
    setCheckedLimits(newChecked);

    // Save to backend
    setSaving(true);
    setSaveError("");
    try {
      const limitUpdates = limitIds.map((limitId) => ({
        limitId,
        isAccepted: checkAll,
      }));
      await api.put(`/relationships/${id}/limits`, {
        limits: limitUpdates,
      });
    } catch (err) {
      console.error("Error toggling category:", err);
      // Revert on failure
      const reverted = new Set(checkedLimits);
      setCheckedLimits(reverted);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la mise à jour des limites."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = (limitId: string) => {
    const currentNote = limitNotes.get(limitId) || "";
    setNoteText(currentNote);
    setEditingNoteForLimit(limitId);
  };

  const handleSaveNote = async () => {
    if (!id || !editingNoteForLimit || savingNote) return;

    const trimmedNote = noteText.trim();
    if (!trimmedNote) {
      setError("La note ne peut pas être vide.");
      return;
    }

    setSavingNote(true);
    try {
      await api.put(
        `/relationships/${id}/limits/${editingNoteForLimit}/note`,
        { note: trimmedNote }
      );

      // Update local state
      const newNotes = new Map(limitNotes);
      newNotes.set(editingNoteForLimit, trimmedNote);
      setLimitNotes(newNotes);

      // Close modal
      setEditingNoteForLimit(null);
      setNoteText("");
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Erreur lors de l'enregistrement de la note."
      );
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!id || !editingNoteForLimit || deletingNote) return;

    setSavingNote(true);
    setDeletingNote(true);
    try {
      await api.delete(
        `/relationships/${id}/limits/${editingNoteForLimit}/note`
      );

      // Update local state
      const newNotes = new Map(limitNotes);
      newNotes.delete(editingNoteForLimit);
      setLimitNotes(newNotes);

      // Close modal
      setEditingNoteForLimit(null);
      setNoteText("");
      setError("");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Erreur lors de la suppression de la note."
      );
    } finally {
      setSavingNote(false);
      setDeletingNote(false);
    }
  };

  const handleCancelNote = () => {
    setEditingNoteForLimit(null);
    setNoteText("");
    setError("");
  };

  const handleDeleteRelationship = async () => {
    if (!id || deleting) return;

    setDeleting(true);
    try {
      await api.delete(`/relationships/${id}`);
      // Navigate back to home on success
      navigate("/home");
    } catch (err) {
      setError("Erreur lors de la suppression de la relation.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!id || blocking) return;

    setBlocking(true);
    try {
      await api.post(`/relationships/${id}/block`);
      // Navigate back to home on success
      navigate("/home");
    } catch (err) {
      setError("Erreur lors du blocage de l'utilisateur.");
      setShowBlockModal(false);
    } finally {
      setBlocking(false);
    }
  };

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
          <button
            className={styles.backButton}
            onClick={() => navigate("/home")}
          >
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
          <p className={styles.errorText}>
            {error || "Relation non trouvée."}
          </p>
          <button
            className={styles.primaryButton}
            onClick={() => navigate("/home")}
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate("/home")}
        >
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
        <h1 className={styles.title}>
          {relationship.partnerName || "Relation"}
        </h1>
        <div className={styles.menuContainer}>
          <button
            className={styles.menuButton}
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            title="Options"
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
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {showOptionsMenu && (
            <div className={styles.dropdown}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowBlockModal(true);
                }}
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                Bloquer
              </button>
              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                onClick={() => {
                  setShowOptionsMenu(false);
                  setShowDeleteModal(true);
                }}
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Supprimer la relation
              </button>
            </div>
          )}
        </div>
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
          {relationship.status === "accepted"
            ? "Relation active"
            : relationship.status}
        </span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "mes-limites" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("mes-limites")}
        >
          Mes limites
        </button>
        <button
          className={`${styles.tab} ${activeTab === "en-commun" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("en-commun")}
        >
          En commun
        </button>
      </div>

      {/* Mes limites tab */}
      {activeTab === "mes-limites" && (
        <div className={styles.limitsContainer}>
          {saveError && (
            <div className={styles.saveErrorBanner} role="alert">
              <p>{saveError}</p>
              <button onClick={() => setSaveError("")} className={styles.dismissButton}>✕</button>
            </div>
          )}
          {limitsLoading ? (
            <div className={styles.loadingSmall}>
              <div className={styles.spinner} />
              <p>Chargement des limites...</p>
            </div>
          ) : categories.length === 0 ? (
            <p className={styles.emptyText}>
              Aucune catégorie de limites trouvée.
            </p>
          ) : (
            <div className={styles.categoriesList}>
              {categories.map((category) => (
                <div key={category.id} className={styles.categoryCard}>
                  <button
                    className={styles.categoryHeader}
                    onClick={() => toggleCategoryExpanded(category.id)}
                  >
                    <span className={styles.categoryIcon}>
                      {category.icon || "📋"}
                    </span>
                    <span className={styles.categoryName}>{category.name}</span>
                    <span className={styles.categoryCount}>
                      {countCheckedInCategory(category, checkedLimits)}
                      /{countLimitsInCategory(category)}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`${styles.chevronIcon} ${expandedCategories.has(category.id) ? styles.chevronExpanded : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {expandedCategories.has(category.id) && (
                    <div className={styles.categoryBody}>
                      <div className={styles.categoryActions}>
                        <button
                          className={styles.categoryActionButton}
                          onClick={() => toggleCategory(category.id, true)}
                          disabled={saving}
                        >
                          Tout cocher
                        </button>
                        <button
                          className={styles.categoryActionButton}
                          onClick={() => toggleCategory(category.id, false)}
                          disabled={saving}
                        >
                          Tout décocher
                        </button>
                      </div>
                      {category.subcategories.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className={styles.subcategory}
                        >
                          <h4 className={styles.subcategoryName}>
                            {subcategory.name}
                          </h4>
                          <div className={styles.limitsList}>
                            {subcategory.limits.map((limit) => (
                              <div key={limit.id} className={styles.limitRow}>
                                <label className={styles.limitItem}>
                                  <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={checkedLimits.has(limit.id)}
                                    onChange={() => toggleLimit(limit.id)}
                                    disabled={saving}
                                  />
                                  <span className={styles.limitName}>
                                    {limit.name}
                                  </span>
                                </label>
                                <button
                                  className={`${styles.noteButton} ${limitNotes.has(limit.id) ? styles.noteButtonActive : ""}`}
                                  onClick={() => handleAddNote(limit.id)}
                                  title={
                                    limitNotes.has(limit.id)
                                      ? "Modifier la note"
                                      : "Ajouter une note"
                                  }
                                  type="button"
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
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* En commun tab */}
      {activeTab === "en-commun" && (
        <div className={styles.limitsContainer}>
          {commonLoading ? (
            <div className={styles.loadingSmall}>
              <div className={styles.spinner} />
              <p>Chargement des limites communes...</p>
            </div>
          ) : commonLimits.length === 0 ? (
            <div className={styles.emptyCommon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-secondary, #78716c)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.4"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <p className={styles.emptyText}>
                Aucune limite en commun pour l'instant.
              </p>
              <p className={styles.hintText}>
                Les limites communes apparaissent lorsque vous et votre
                partenaire cochez les mêmes limites.
              </p>
            </div>
          ) : (
            <div className={styles.commonList}>
              <p className={styles.commonCount}>
                {commonLimits.length} limite
                {commonLimits.length > 1 ? "s" : ""} en commun
              </p>
              {commonLimits.map((limit) => (
                <div key={limit.id} className={styles.commonItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-primary, #6366f1)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span className={styles.commonName}>{limit.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Block confirmation modal */}
      {showBlockModal && (
        <div className={styles.modalOverlay} onClick={() => setShowBlockModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Bloquer cet utilisateur</h3>
            <p className={styles.modalText}>
              Êtes-vous sûr de vouloir bloquer {relationship.partnerName} ? Cette
              action supprimera votre relation et empêchera cette personne de vous
              envoyer de nouvelles invitations. Vous pouvez débloquer cet utilisateur
              plus tard depuis les paramètres.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowBlockModal(false)}
                disabled={blocking}
              >
                Annuler
              </button>
              <button
                className={styles.modalDeleteButton}
                onClick={handleBlockUser}
                disabled={blocking}
              >
                {blocking ? "Blocage..." : "Bloquer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Supprimer la relation</h3>
            <p className={styles.modalText}>
              Êtes-vous sûr de vouloir supprimer cette relation avec{" "}
              {relationship.partnerName} ? Toutes les limites communes seront
              définitivement supprimées. Cette action est irréversible.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                className={styles.modalDeleteButton}
                onClick={handleDeleteRelationship}
                disabled={deleting}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note editing modal */}
      {editingNoteForLimit && (
        <div
          className={styles.modalOverlay}
          onClick={handleCancelNote}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.modalTitle}>
              {limitNotes.has(editingNoteForLimit)
                ? "Modifier la note"
                : "Ajouter une note"}
            </h3>
            <p className={styles.modalText}>
              Ajoutez un commentaire personnel sur cette limite (maximum 500
              caractères).
            </p>
            <textarea
              className={styles.noteTextarea}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Votre note personnelle..."
              maxLength={500}
              rows={4}
              autoFocus
            />
            <div className={styles.noteCharCount}>
              {noteText.length} / 500 caractères
            </div>
            {error && <p className={styles.errorText}>{error}</p>}
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelButton}
                onClick={handleCancelNote}
                disabled={savingNote}
              >
                Annuler
              </button>
              {limitNotes.has(editingNoteForLimit) && (
                <button
                  className={styles.modalDeleteButton}
                  onClick={handleDeleteNote}
                  disabled={savingNote || deletingNote}
                >
                  {deletingNote ? "Suppression..." : "Supprimer"}
                </button>
              )}
              <button
                className={styles.modalSaveButton}
                onClick={handleSaveNote}
                disabled={savingNote || !noteText.trim()}
              >
                {savingNote ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function countLimitsInCategory(category: Category): number {
  return category.subcategories.reduce(
    (sum, sub) => sum + sub.limits.length,
    0
  );
}

function countCheckedInCategory(
  category: Category,
  checked: Set<string>
): number {
  return category.subcategories.reduce(
    (sum, sub) =>
      sum + sub.limits.filter((l) => checked.has(l.id)).length,
    0
  );
}
