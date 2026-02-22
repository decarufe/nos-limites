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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

      // Build set of accepted limit IDs
      const accepted = new Set<string>();
      for (const ul of limRes.data.limits) {
        if (ul.isAccepted) {
          accepted.add(ul.limitId);
        }
      }
      setCheckedLimits(accepted);
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

  const toggleCategory = (categoryId: string) => {
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
    try {
      await api.put(`/relationships/${id}/limits`, {
        limits: [{ limitId, isAccepted }],
      });
    } catch {
      // Revert on failure
      const reverted = new Set(checkedLimits);
      setCheckedLimits(reverted);
    } finally {
      setSaving(false);
    }
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
                    onClick={() => toggleCategory(category.id)}
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
                              <label
                                key={limit.id}
                                className={styles.limitItem}
                              >
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
