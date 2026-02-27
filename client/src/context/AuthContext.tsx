import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "../services/api";

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    token: string,
    user: User,
    deviceId?: string,
    deviceToken?: string,
  ) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "nos_limites_token";
const DEVICE_ID_KEY = "nos_limites_device_id";
const DEVICE_TOKEN_KEY = "nos_limites_device_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Sync the React state with whatever token the api service currently holds.
   * This is needed because the api service may have refreshed the token
   * transparently via device token recovery (on 401 auto-retry).
   */
  const syncTokenFromStorage = useCallback(() => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      api.setToken(currentToken);
      setToken(currentToken);
    }
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const hasDeviceTokens =
        !!localStorage.getItem(DEVICE_ID_KEY) &&
        !!localStorage.getItem(DEVICE_TOKEN_KEY);

      if (savedToken) {
        api.setToken(savedToken);
        setToken(savedToken);
      }

      if (savedToken || hasDeviceTokens) {
        // If we have a saved JWT, verify it via /auth/session.
        // The api service now auto-recovers on 401 using device tokens,
        // so this call will succeed even if the JWT expired — as long as
        // a valid device token exists in localStorage.
        //
        // If there's no saved JWT but there ARE device tokens, we still
        // attempt /auth/session. The first call will 401 → the api service
        // will recover → retry with the new JWT → succeed.
        try {
          const data = await api.get<{ user: User }>("/auth/session");
          // After a potential recovery, sync the token state
          syncTokenFromStorage();
          setUser(data.user);
        } catch {
          // Recovery failed — clear everything
          localStorage.removeItem(TOKEN_KEY);
          api.setToken(null);
          setToken(null);
          setUser(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [syncTokenFromStorage]);

  const login = useCallback(
    (
      newToken: string,
      newUser: User,
      deviceId?: string,
      deviceToken?: string,
    ) => {
      localStorage.setItem(TOKEN_KEY, newToken);
      api.setToken(newToken);
      setToken(newToken);
      setUser(newUser);

      // Store device tokens if provided
      if (deviceId && deviceToken) {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
        localStorage.setItem(DEVICE_TOKEN_KEY, deviceToken);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore errors during logout
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEVICE_ID_KEY);
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    api.setToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
