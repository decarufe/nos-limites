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

  // Try to recover session using device token
  const tryDeviceRecovery = useCallback(async (): Promise<boolean> => {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);

    if (!deviceId || !deviceToken) return false;

    try {
      const response = await api.post<{
        token: string;
        user: User;
        deviceId: string;
        deviceToken: string;
      }>("/auth/device/refresh", { deviceId, deviceToken });

      // Store rotated tokens
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(DEVICE_ID_KEY, response.deviceId);
      localStorage.setItem(DEVICE_TOKEN_KEY, response.deviceToken);
      api.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      return true;
    } catch {
      // Device token invalid — clear it
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      return false;
    }
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      api.setToken(savedToken);
      setToken(savedToken);
      // Verify the session is still valid
      api
        .get<{ user: User }>("/auth/session")
        .then((data) => {
          setUser(data.user);
        })
        .catch(async () => {
          // JWT expired — try device token recovery
          localStorage.removeItem(TOKEN_KEY);
          api.setToken(null);
          setToken(null);

          const recovered = await tryDeviceRecovery();
          if (!recovered) {
            // Full logout state
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // No JWT — try device token recovery (session may have been cleared)
      tryDeviceRecovery().finally(() => {
        setIsLoading(false);
      });
    }
  }, [tryDeviceRecovery]);

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
