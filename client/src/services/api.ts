/**
 * Base API service for making HTTP requests to the backend.
 * All API calls go through this service.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
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
      throw new Error(error.message || `Erreur HTTP ${response.status}`);
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

