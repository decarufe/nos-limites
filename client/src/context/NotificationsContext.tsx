import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";

interface NotificationsContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await api.get<{
        success: boolean;
        data: Array<{ isRead: boolean }>;
      }>("/notifications");
      const count = response.data.filter((n) => !n.isRead).length;
      setUnreadCount(count);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const decrementUnreadCount = () => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  // Fetch unread count when authenticated
  useEffect(() => {
    refreshUnreadCount();
  }, [isAuthenticated]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, refreshUnreadCount, decrementUnreadCount, resetUnreadCount }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
