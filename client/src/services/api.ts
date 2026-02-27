/**
 * Base API service for making HTTP requests to the backend.
 * All API calls go through this service.
 *
 * Includes automatic session recovery: if a request returns 401 (session expired),
 * the service attempts to refresh the session using the device token and retries
 * the original request once. This ensures sessions are effectively permanent on
 * a device, as long as the device token (365 days) is valid.
 */

/**
 * Error class for API responses that preserves the HTTP status code.
 * This allows callers to distinguish between server-side rejections (e.g. 401)
 * and transient network/connectivity errors where no status is available.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // Required for proper instanceof checks when targeting ES5 in TypeScript
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}


export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://nos-limites-api.vercel.app/api" : "/api");

const TOKEN_KEY = "nos_limites_token";
const DEVICE_ID_KEY = "nos_limites_device_id";
const DEVICE_TOKEN_KEY = "nos_limites_device_token";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiService {
  private token: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  /**
   * Attempt to refresh the session using the device token.
   * Returns true if recovery was successful.
   * Uses a shared promise to prevent multiple concurrent refresh attempts.
   */
  private async tryDeviceRecovery(): Promise<boolean> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doDeviceRecovery();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doDeviceRecovery(): Promise<boolean> {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);

    if (!deviceId || !deviceToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/device/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, deviceToken }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Server explicitly rejected the device token — clear it
          localStorage.removeItem(DEVICE_ID_KEY);
          localStorage.removeItem(DEVICE_TOKEN_KEY);
          localStorage.removeItem(TOKEN_KEY);
        }
        return false;
      }

      const data = await response.json();

      // Store rotated tokens
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(DEVICE_ID_KEY, data.deviceId);
      localStorage.setItem(DEVICE_TOKEN_KEY, data.deviceToken);
      this.token = data.token;

      return true;
    } catch {
      // Network error — don't clear tokens (transient failure)
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: ApiOptions = {},
    isRetry: boolean = false,
  ): Promise<T> {
    const { method = "GET", body, headers = {}, signal } = options;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (this.token) {
      requestHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      // On 401 (session expired), try to recover using device token and retry once
      if (response.status === 401 && !isRetry && !endpoint.includes("/auth/device/refresh")) {
        const recovered = await this.tryDeviceRecovery();
        if (recovered) {
          // Retry the original request with the new token
          return this.request<T>(endpoint, options, true);
        }
      }

      const error = await response.json().catch(() => ({
        message: "Une erreur est survenue",
      }));
      throw new ApiError(error.message || `Erreur HTTP ${response.status}`, response.status);
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>(endpoint, options);
  }

  post<T>(endpoint: string, body?: unknown, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body, ...options });
  }

  put<T>(endpoint: string, body?: unknown, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body, ...options });
  }

  delete<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", ...options });
  }
}

export const api = new ApiService();

// Default export for backward compatibility with `import api from "./api"`
export default api;
