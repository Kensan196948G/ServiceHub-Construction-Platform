import { useAuthStore } from "@/stores/authStore";

const BASE_URL = "/api/v1";

// Axios-compatible response shape so existing api/*.ts modules need no changes
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public response: { data: unknown; status: number },
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T = unknown>(
  method: string,
  path: string,
  options: { params?: Record<string, unknown>; body?: unknown } = {}
): Promise<ApiResponse<T>> {
  const { params, body } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const search = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    );
    if (search.toString()) url += `?${search}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = useAuthStore.getState().token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → logout and redirect (mirrors axios interceptor)
  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  }

  // Parse JSON body (empty responses like DELETE 204 return null)
  let data: T;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") && res.status !== 204) {
    data = (await res.json()) as T;
  } else {
    data = null as unknown as T;
  }

  if (!res.ok) {
    throw new ApiError(res.status, { data, status: res.status }, `HTTP ${res.status}`);
  }

  return { data, status: res.status, headers: res.headers };
}

// Axios-compatible API surface
const api = {
  get: <T = unknown>(path: string, options?: { params?: Record<string, unknown> }) =>
    request<T>("GET", path, { params: options?.params }),

  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),

  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>("PUT", path, { body }),

  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>("PATCH", path, { body }),

  delete: <T = unknown>(path: string) =>
    request<T>("DELETE", path),
};

export default api;
