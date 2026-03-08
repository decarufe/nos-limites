import { useState } from "react";
import FeedbackModal from "./FeedbackModal";
import styles from "./FeedbackButton.module.css";

/**
 * Floating feedback action button.
 * Rendered inside AppLayout — visible on all main app screens.
 * Opens FeedbackModal on click.
 */
export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(true)}
        aria-label="Envoyer un feedback"
        title="Envoyer un feedback"
      >
        <span aria-hidden="true">💬</span>
      </button>

      {isOpen && <FeedbackModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
