import { useAuthStore } from "@/stores/authStore";

const BASE_URL = "/api/v1";

interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public response: { data: unknown; status: number },
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

// Shared promise to prevent concurrent refresh attempts
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const tokens = await res.json();
    useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let url = `${BASE_URL}${path}`;
  if (options.params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(options.params)) {
      if (v !== undefined) search.set(k, String(v));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body:
      body instanceof FormData ? body
      : body !== undefined ? JSON.stringify(body)
      : undefined,
  };

  let res = await fetch(url, fetchOptions);

  // On 401, attempt token refresh once, then retry
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
    }
    const refreshed = await refreshPromise;

    if (refreshed) {
      // Retry with new token
      const newToken = useAuthStore.getState().token;
      if (newToken) {
        (fetchOptions.headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
      }
      res = await fetch(url, fetchOptions);
    }

    // If still 401 after refresh attempt, logout
    if (res.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
  }

  let data: unknown = null;
  const ct = res.headers.get("content-type") ?? "";
  if (res.status !== 204 && ct.includes("application/json")) {
    data = await res.json();
  }

  if (!res.ok) {
    throw new ApiError(res.status, { data, status: res.status }, `HTTP ${res.status}`);
  }

  return { data: data as T, status: res.status, headers: res.headers };
}

const api = {
  get<T = unknown>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, undefined, options);
  },
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, body, options);
  },
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, body, options);
  },
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, body, options);
  },
  delete<T = unknown>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, undefined, options);
  },
};

export default api;
