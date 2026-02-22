import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./ProtectedRoute.module.css";

const PENDING_REDIRECT_KEY = "nos_limites_pending_redirect";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Chargement...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirectPath = location.pathname + location.search;
    if (redirectPath !== "/login") {
      sessionStorage.setItem(PENDING_REDIRECT_KEY, redirectPath);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
