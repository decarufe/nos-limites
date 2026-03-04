import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import styles from "./InvitePage.module.css";

const WEBSITE_URL = "https://nos-limites.com";

interface InviteDetails {
  id: string;
  inviterName: string;
  inviterAvatarUrl: string | null;
  status: string;
  createdAt: string;
  activeCategories: string[] | null;
}

interface InviteResponse {
  success: boolean;
  data: InviteDetails;
}

interface AcceptResponse {
  success: boolean;
  data: {
    relationshipId: string;
    status: string;
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

const CATEGORY_ICONS: Record<string, string> = {
  "Contact professionnel": "🤝",
  "Contact amical": "😊",
  "Flirt et séduction": "💬",
  "Contact rapproché": "🤗",
  "Intimité": "💕",
};

const DEFAULT_CATEGORY_ICON = "📌";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [status, setStatus] = useState<
    "loading" | "loaded" | "accepting" | "accepted" | "declining" | "declined" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isOwnInvitation, setIsOwnInvitation] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        const response = await api.get<InviteResponse>(
          `/relationships/invite/${token}`
        );
        setInvite(response.data);
        if (response.data.activeCategories && response.data.activeCategories.length > 0) {
          setSelectedCategories(response.data.activeCategories);
        }
        setStatus("loaded");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erreur inconnue";
        setErrorMessage(message);
        if (message.includes("propre invitation")) {
          setIsOwnInvitation(true);
        }
        if (message.includes("déjà été acceptée")) {
          setAlreadyAccepted(true);
        }
        setStatus("error");
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await api.get<CategoriesResponse>("/limits/categories");
        setAllCategories(response.data);
      } catch {
        // Non-critical: fall back gracefully if categories can't be loaded
      }
    };

    fetchInvite();
    fetchCategories();
  }, [token]);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const handleAccept = async () => {
    if (!token || status !== "loaded") return;
    setStatus("accepting");

    try {
      await api.post<AcceptResponse>(`/relationships/accept/${token}`, {
        selectedCategories: selectedCategories,
      });
      setStatus("accepted");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'acceptation de l'invitation."
      );
      setStatus("error");
    }
  };

  const handleDecline = async () => {
    if (!token || status !== "loaded") return;
    setStatus("declining");

    try {
      await api.post(`/relationships/decline/${token}`);
      setStatus("declined");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Erreur lors du refus de l'invitation."
      );
      setStatus("error");
    }
  };

  const handleGoToRelations = () => {
    navigate("/home");
  };

  const invitedCategoryNames = invite?.activeCategories ?? [];
  const extraCategories = allCategories.filter(
    (cat) => !invitedCategoryNames.includes(cat.name)
  );
  const invitedCategories = allCategories.filter((cat) =>
    invitedCategoryNames.includes(cat.name)
  );

  const renderCategoryRow = (cat: Category, isInvited: boolean) => {
    const isSelected = selectedCategories.includes(cat.name);
    const isExpanded = expandedCategories.has(cat.name);
    const icon = CATEGORY_ICONS[cat.name] ?? DEFAULT_CATEGORY_ICON;
    const totalLimits = cat.subcategories.reduce(
      (sum, sub) => sum + sub.limits.length,
      0
    );

    return (
      <div key={cat.id} className={styles.categoryRow}>
        <div className={styles.categoryRowHeader}>
          <label className={styles.categoryLabel}>
            <input
              type="checkbox"
              className={styles.categoryCheckbox}
              checked={isSelected}
              onChange={() => toggleCategory(cat.name)}
            />
            <span className={styles.categoryIcon}>{icon}</span>
            <span className={styles.categoryName}>{cat.name}</span>
            {isInvited && (
              <span className={styles.invitedBadge}>proposée</span>
            )}
          </label>
          <button
            className={styles.expandButton}
            onClick={() => toggleExpand(cat.name)}
            aria-label={isExpanded ? "Réduire" : "Voir les limites"}
            title={`${totalLimits} limite${totalLimits !== 1 ? "s" : ""}`}
          >
            <span className={isExpanded ? styles.expandIconOpen : styles.expandIcon}>
              ▾
            </span>
          </button>
        </div>
        {isExpanded && (
          <div className={styles.limitsPanel}>
            {cat.subcategories.length === 0 ? (
              <p className={styles.noLimitsText}>Aucune limite dans cette section.</p>
            ) : (
              cat.subcategories.map((sub) => (
                <div key={sub.id} className={styles.subcategoryBlock}>
                  <p className={styles.subcategoryName}>{sub.name}</p>
                  <ul className={styles.limitsList}>
                    {sub.limits.map((limit) => (
                      <li key={limit.id} className={styles.limitItem}>
                        {limit.name}
                        {limit.description && (
                          <span className={styles.limitDescription}> — {limit.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Invitation</h1>
      </header>

      {status === "loading" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Chargement de l'invitation...</p>
        </div>
      )}

      {status === "loaded" && invite && (
        <div className={styles.contentLoaded}>
          <div className={styles.avatarSection}>
            {invite.inviterAvatarUrl ? (
              <img
                src={invite.inviterAvatarUrl}
                alt={invite.inviterName}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {invite.inviterName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className={styles.inviterName}>{invite.inviterName}</h2>
          <p className={styles.text}>
            vous invite à définir vos limites mutuelles.
          </p>

          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.websiteLink}
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
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            En savoir plus sur nos-limites.com
          </a>

          {allCategories.length > 0 && (
            <div className={styles.categoriesSelectionSection}>
              {invitedCategories.length > 0 && (
                <>
                  <p className={styles.categoriesGroupTitle}>
                    Sections proposées par {invite.inviterName} :
                  </p>
                  <div className={styles.categoriesGroup}>
                    {invitedCategories.map((cat) => renderCategoryRow(cat, true))}
                  </div>
                </>
              )}

              {extraCategories.length > 0 && (
                <>
                  <p className={styles.categoriesGroupTitle}>
                    {invitedCategories.length > 0
                      ? "Ajouter d'autres sections :"
                      : "Sections à partager :"}
                  </p>
                  <div className={styles.categoriesGroup}>
                    {extraCategories.map((cat) => renderCategoryRow(cat, false))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.acceptButton}
              onClick={handleAccept}
              disabled={status !== "loaded"}
            >
              Accepter
            </button>
            <button
              className={styles.declineButton}
              onClick={handleDecline}
              disabled={status !== "loaded"}
            >
              Refuser
            </button>
          </div>
        </div>
      )}

      {status === "accepting" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Acceptation en cours...</p>
        </div>
      )}

      {status === "declining" && (
        <div className={styles.content}>
          <div className={styles.spinner} />
          <p className={styles.text}>Refus en cours...</p>
        </div>
      )}

      {status === "declined" && (
        <div className={styles.content}>
          <div className={styles.successIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-secondary, #78716c)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Invitation refusée</h2>
          <p className={styles.text}>
            L'invitation a été refusée. Vous ne recevrez plus de notifications
            de cette personne.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleGoToRelations}
          >
            Retour à l'accueil
          </button>
        </div>
      )}

      {status === "accepted" && (
        <div className={styles.content}>
          <div className={styles.successIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successTitle}>Invitation acceptée !</h2>
          <p className={styles.text}>
            Vous pouvez maintenant définir vos limites avec cette personne.
          </p>
          <button
            className={styles.primaryButton}
            onClick={handleGoToRelations}
          >
            Voir mes relations
          </button>
        </div>
      )}

      {status === "error" && (
        <div className={styles.content}>
          <div className={styles.errorIcon}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-error, #dc2626)"
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
          {isOwnInvitation && (
            <p className={styles.hintText}>
              Partagez ce lien avec une autre personne pour l'inviter.
            </p>
          )}
          {alreadyAccepted && (
            <p className={styles.hintText}>
              Cette invitation a déjà été utilisée.
            </p>
          )}
          <button
            className={styles.primaryButton}
            onClick={() => navigate("/home")}
          >
            Retour à l'accueil
          </button>
        </div>
      )}
    </div>
  );
}
