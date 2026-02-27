/**
 * Base API service for making HTTP requests to the backend.
 * All API calls go through this service.
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
  import.meta.env.VITE_API_BASE_URL |
  (import.meta.env.PROD ? "https://nos-limites-api.vercel.app/api" : "/api");

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: ApiOptions = {},
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
export default api;
