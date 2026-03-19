export type ApiError = { code: string; details: string };
export type ApiMeta = {
  requestId?: string;
  timestamp?: string;
  durationMs?: number;
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
};
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error: ApiError | null;
  meta: ApiMeta | null;
};

const baseUrl = "https://cms.penielchristianchurchkitui.com/";

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(path, baseUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || "";
  return "";
};

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 150;
type CacheEntry = { expiresAt: number; value: ApiResponse<unknown> };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ApiResponse<unknown>>>();

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const keys = cache.keys();
  while (cache.size > MAX_CACHE_ENTRIES) {
    const next = keys.next();
    if (next.done) break;
    cache.delete(next.value);
  }
};

const invalidateByPath = (path: string) => {
  for (const key of cache.keys()) {
    if (key.includes(path)) {
      cache.delete(key);
    }
  }
};

let refreshInFlight: Promise<{ expiresAt: string } | null> | null = null;

const refreshSession = async () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        const payload = (await res.json()) as ApiResponse<{ expiresAt: string; csrfToken?: string }>;
        if (!res.ok || !payload.success) return null;
        const { expiresAt, csrfToken } = payload.data;
        localStorage.setItem("sessionExpiresAt", expiresAt);
        if (csrfToken) {
          localStorage.setItem("csrfToken", csrfToken);
        }
        window.dispatchEvent(new CustomEvent("session-refreshed", { detail: { expiresAt, csrfToken } }));
        return { expiresAt };
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const request = async <T>(method: string, path: string, body?: unknown, params?: Record<string, string | number | undefined>) => {
  const url = buildUrl(path, params);
  const cacheKey = `${method}:${url}`;
  if (method === "GET") {
    pruneCache();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as ApiResponse<T>;
    }
    const existing = inFlight.get(cacheKey);
    if (existing) {
      return (await existing) as ApiResponse<T>;
    }
  } else {
    invalidateByPath(path);
  }

  const doFetch = () =>
    fetch(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCookie("csrf_token") || localStorage.getItem("csrfToken") || "",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  const fetchPromise = doFetch().then(async (res) => {
    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await res.json()) as ApiResponse<T>;
    } catch {
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
      throw new Error("Unexpected server response");
    }
    if (!res.ok || !payload.success) {
      if (res.status === 401 || payload.error?.code?.includes("401") || payload.message === "SESSION_EXPIRED") {
        const refreshed = await refreshSession();
        if (refreshed) {
          return doFetch().then(async (retryRes) => {
            const retryPayload = (await retryRes.json()) as ApiResponse<T>;
            if (!retryRes.ok || !retryPayload.success) {
              window.dispatchEvent(new CustomEvent("session-expired"));
              throw new Error(retryPayload.error?.details || retryPayload.message);
            }
            return retryPayload;
          });
        }
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
      throw new Error(payload.error?.details || payload.message);
    }
    return payload;
  });

  if (method === "GET") {
    inFlight.set(cacheKey, fetchPromise as Promise<ApiResponse<unknown>>);
  }

  let payload: ApiResponse<T>;
  try {
    payload = await (fetchPromise as Promise<ApiResponse<T>>);
  } finally {
    if (method === "GET") {
      inFlight.delete(cacheKey);
    }
  }
  if (method === "GET") {
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: payload as ApiResponse<unknown> });
  }
  return payload;
};

export const apiGet = <T>(path: string, params?: Record<string, string | number | undefined>) =>
  request<T>("GET", path, undefined, params);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
