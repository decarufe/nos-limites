import { useState } from "react";
import { api } from "../services/api";
import styles from "./FeedbackModal.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackType = "bug" | "suggestion" | "autre";

interface FeedbackModalProps {
  onClose: () => void;
}

interface SubmitResponse {
  success: boolean;
  issueUrl: string;
  issueNumber: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] =
  [
    { value: "bug", label: "Bug", emoji: "🐛" },
    { value: "suggestion", label: "Suggestion", emoji: "💡" },
    { value: "autre", label: "Autre", emoji: "❓" },
  ];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || status === "submitting") return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await api.post<SubmitResponse>("/feedback", {
        type,
        title: title.trim(),
        description: description.trim(),
      });

      setIssueUrl(response.issueUrl);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le feedback. Veuillez réessayer.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  // ─── Success state ────────────────────────────────────────────────

  if (status === "success") {
    return (
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-label="Feedback envoyé"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={styles.modal}>
          <div className={styles.successContent}>
            <div className={styles.successIcon} aria-hidden="true">
              ✅
            </div>
            <h2 className={styles.successTitle}>Merci pour votre feedback !</h2>
            <p className={styles.successText}>
              Votre ticket a été créé avec succès.
            </p>
            {issueUrl && (
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.issueLink}
              >
                Voir le ticket GitHub →
              </a>
            )}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form state ───────────────────────────────────────────────────

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Envoyer un feedback"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Envoyer un feedback</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Type selector */}
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Type</legend>
            <div className={styles.typeOptions}>
              {FEEDBACK_TYPES.map(({ value, label, emoji }) => (
                <label
                  key={value}
                  className={`${styles.typeOption} ${type === value ? styles.typeOptionActive : ""}`}
                >
                  <input
                    type="radio"
                    name="feedbackType"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className={styles.hiddenRadio}
                  />
                  <span aria-hidden="true">{emoji}</span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Title */}
          <div className={styles.field}>
            <label htmlFor="feedback-title" className={styles.label}>
              Titre <span className={styles.required}>*</span>
            </label>
            <input
              id="feedback-title"
              type="text"
              className={styles.input}
              placeholder="Résumé en une ligne…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={256}
              required
              disabled={status === "submitting"}
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="feedback-description" className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="feedback-description"
              className={styles.textarea}
              placeholder="Décrivez le problème ou la suggestion en détail…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4096}
              required
              disabled={status === "submitting"}
            />
          </div>

          {/* Error */}
          {status === "error" && (
            <p className={styles.errorMessage} role="alert">
              {errorMessage}
            </p>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={status === "submitting"}
            >
              Annuler
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!isValid || status === "submitting"}
            >
              {status === "submitting" ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
