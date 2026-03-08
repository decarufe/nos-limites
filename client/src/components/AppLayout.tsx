import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import FeedbackButton from "./FeedbackButton";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <FeedbackButton />
      <BottomNav />
    </div>
  );
}
