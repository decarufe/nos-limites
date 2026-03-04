import { useState, useEffect, useMemo } from "react";
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

interface Limit {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
}

interface Subcategory {
  id: string;
  name: string;
  sortOrder: number;
  limits: Limit[];
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  subcategories: Subcategory[];
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
  count: number;
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

export default function ScanPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "configuring" | "generating" | "generated" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [checkedLimits, setCheckedLimits] = useState<Set<string>>(new Set());
  const [checkedSections, setCheckedSections] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      const response = await api.get<CategoriesResponse>("/limits/categories");
      setCategories(response.data);
    } catch {
      setCategoriesError(true);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "configuring" || categories.length > 0 || categoriesLoading || categoriesError) return;
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, categories.length, categoriesLoading, categoriesError]);

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

  const handleToggleLimit = (limitId: string) => {
    setCheckedLimits((prev) => {
      const next = new Set(prev);
      if (next.has(limitId)) {
        next.delete(limitId);
      } else {
        next.add(limitId);
      }
      return next;
    });
  };

  const handleToggleSection = (categoryId: string) => {
    setCheckedSections((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleCategoryAll = (category: Category, checkAll: boolean) => {
    setCheckedLimits((prev) => {
      const next = new Set(prev);
      for (const sub of category.subcategories) {
        for (const limit of sub.limits) {
          if (checkAll) {
            next.add(limit.id);
          } else {
            next.delete(limit.id);
          }
        }
      }
      return next;
    });
    if (checkAll) {
      setCheckedSections((prev) => new Set([...prev, category.id]));
    } else {
      setCheckedSections((prev) => {
        const next = new Set(prev);
        next.delete(category.id);
        return next;
      });
    }
  };

  const handleToggleExpanded = (categoryId: string) => {
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

  const activeCategories = useMemo(
    () =>
      categories
        .filter((cat) =>
          checkedSections.has(cat.id) ||
          cat.subcategories.some((sub) =>
            sub.limits.some((l) => checkedLimits.has(l.id))
          )
        )
        .map((cat) => cat.name),
    [categories, checkedLimits, checkedSections]
  );

  const handleGenerateInvitation = async () => {
    setStatus("generating");
    setErrorMessage("");
    setCopied(false);

    try {
      const response = await api.post<InviteResponse>(
        "/relationships/invite",
        {
          activeCategories,
          selectedLimits: Array.from(checkedLimits),
        }
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
    setCheckedLimits(new Set());
    setCheckedSections(new Set());
    setExpandedCategories(new Set());
    setCategoriesError(false);
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
            onClick={() => setStatus("configuring")}
          >
            Generer une invitation
          </button>
        </div>
      )}

      {status === "configuring" && (
        <div className={styles.configuringContent}>
          <h2 className={styles.configuringTitle}>Mes limites</h2>
          <p className={styles.configuringText}>
            Sélectionnez vos limites pour cette relation. Elles seront
            enregistrées dès la création de l'invitation.
          </p>
          {categoriesLoading ? (
            <div className={styles.loadingSmall}>
              <div className={styles.spinner} />
              <p>Chargement des limites...</p>
            </div>
          ) : categoriesError ? (
            <div className={styles.categoriesErrorState}>
              <p className={styles.categoriesErrorText}>
                Impossible de charger les limites. Veuillez réessayer.
              </p>
              <button
                className={styles.retryButton}
                onClick={fetchCategories}
              >
                Réessayer
              </button>
            </div>
          ) : categories.length === 0 ? (
            <p className={styles.configuringText}>
              Aucune catégorie de limites disponible.
            </p>
          ) : (
            <div className={styles.limitsTree}>
              {categories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const checkedCount = countCheckedInCategory(category, checkedLimits);
                const totalCount = countLimitsInCategory(category);
                return (
                  <div key={category.id} className={styles.categoryCard}>
                    <div className={styles.categoryHeader}>
                      <label className={styles.sectionCheckboxLabel}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={checkedSections.has(category.id)}
                          onChange={() => handleToggleSection(category.id)}
                        />
                      </label>
                      <button
                        className={styles.categoryHeaderButton}
                        onClick={() => handleToggleExpanded(category.id)}
                      >
                        <span className={styles.categoryIcon}>
                          {category.icon || "📋"}
                        </span>
                        <span className={styles.categoryName}>{category.name}</span>
                        <span className={styles.categoryCount}>
                          {checkedCount}/{totalCount}
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
                          className={`${styles.chevronIcon} ${isExpanded ? styles.chevronExpanded : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className={styles.categoryBody}>
                        <div className={styles.categoryActions}>
                          <button
                            className={styles.categoryActionButton}
                            onClick={() => handleToggleCategoryAll(category, true)}
                          >
                            Tout cocher
                          </button>
                          <button
                            className={styles.categoryActionButton}
                            onClick={() => handleToggleCategoryAll(category, false)}
                          >
                            Tout décocher
                          </button>
                        </div>
                        {category.subcategories.map((subcategory) => (
                          <div key={subcategory.id} className={styles.subcategory}>
                            <h4 className={styles.subcategoryName}>
                              {subcategory.name}
                            </h4>
                            <div className={styles.limitsList}>
                              {subcategory.limits.map((limit) => (
                                <label key={limit.id} className={styles.limitItem}>
                                  <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={checkedLimits.has(limit.id)}
                                    onChange={() => handleToggleLimit(limit.id)}
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
                );
              })}
            </div>
          )}
          <button
            className={styles.primaryButton}
            onClick={handleGenerateInvitation}
            disabled={categoriesLoading}
          >
            Créer l'invitation
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() => setStatus("idle")}
          >
            Annuler
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
