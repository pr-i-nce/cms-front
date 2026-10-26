import { getApiBaseUrl } from "@/lib/apiBase";

export type ApiError = { code: string; details: string };
export type ApiMeta = {
  requestId?: string;
  timestamp?: string;
  durationMs?: number;
  stale?: boolean;
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
};
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error: ApiError | null;
  meta: ApiMeta | null;
};

const baseUrl = getApiBaseUrl();

export class ApiRequestFailure extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly retryable = false,
    readonly allowStale = true,
  ) {
    super(message);
    this.name = "ApiRequestFailure";
  }
}

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

// Keep route data warm long enough to make normal in-app navigation cache-first.
// Expired entries are served immediately while one background revalidation runs.
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_STALE_MS = 30 * 60_000;
const MAX_CACHE_ENTRIES = 150;
const REQUEST_TIMEOUT_MS = 15_000;
const RESPONSE_TIMEOUT_MS = 15_000;
const MAX_GET_ATTEMPTS = 2;
type CacheEntry = { expiresAt: number; staleUntil: number; path: string; value: ApiResponse<unknown> };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ApiResponse<unknown>>>();
let cacheEpoch = 0;

const pruneCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.staleUntil <= now) {
      cache.delete(key);
    }
  }
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
};

export const clearApiCache = () => {
  cache.clear();
  cacheEpoch += 1;
  window.dispatchEvent(new CustomEvent("api-cache-cleared"));
};

const invalidationGroups: Record<string, string[]> = {
  "/api/members": ["/api/members", "/api/departments", "/api/committees", "/api/reports", "/api/sms/segments"],
  "/api/departments": ["/api/departments", "/api/members", "/api/reports", "/api/sms/segments"],
  "/api/committees": ["/api/committees", "/api/members", "/api/reports", "/api/sms/segments"],
  "/api/sms": ["/api/sms", "/api/reports"],
  "/api/branches": ["/api/branches", "/api/members", "/api/reports"],
  "/api/users": ["/api/users", "/api/groups", "/api/roles", "/api/permissions"],
  "/api/groups": ["/api/groups", "/api/users", "/api/roles", "/api/permissions"],
  "/api/roles": ["/api/roles", "/api/groups", "/api/users", "/api/permissions"],
  "/api/permissions": ["/api/permissions", "/api/roles", "/api/groups", "/api/users"],
};

const invalidateApiCache = (mutationPath: string) => {
  const group = Object.entries(invalidationGroups).find(([prefix]) => mutationPath.startsWith(prefix));
  if (!group) {
    clearApiCache();
    return;
  }
  const affectedPrefixes = group[1];
  const previousEpoch = cacheEpoch;
  cacheEpoch += 1;
  const retained = new Map<string, CacheEntry>();
  for (const [key, entry] of cache) {
    if (!affectedPrefixes.some((prefix) => entry.path.startsWith(prefix))) {
      retained.set(`${cacheEpoch}:${key.slice(`${previousEpoch}:`.length)}`, entry);
    }
  }
  cache.clear();
  for (const [key, entry] of retained) cache.set(key, entry);
  window.dispatchEvent(new CustomEvent("api-cache-invalidated", { detail: { path: mutationPath } }));
};

const fetchOnce = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiRequestFailure(
      timedOut ? "The server took too long to respond. Please try again." : "Unable to reach the server. Check your connection and try again.",
      null,
      true,
    );
  } finally {
    window.clearTimeout(timeout);
  }
};

const fetchWithRetry = async (url: string, init: RequestInit, attempts: number) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetchOnce(url, init);
    } catch (error) {
      if (!(error instanceof ApiRequestFailure) || !error.retryable || attempt === attempts - 1) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      continue;
    }
    const retryable = [500, 502, 503, 504].includes(response.status);
    if (!retryable || attempt === attempts - 1) return response;
    await response.body?.cancel().catch(() => {});
    await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new ApiRequestFailure("Unable to reach the server. Please try again.", null, true);
};

const parseResponse = async <T,>(response: Response): Promise<ApiResponse<T>> => {
  let timeoutId = 0;
  let timedOut = false;
  try {
    const json = await Promise.race([
      response.json(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          timedOut = true;
          reject(new Error("Response timed out"));
        }, RESPONSE_TIMEOUT_MS);
      }),
    ]);
    return json as ApiResponse<T>;
  } catch {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (timedOut) {
      void response.body?.cancel().catch(() => {});
      throw new ApiRequestFailure("The server started a response but did not finish it in time.", null, true);
    }
    throw new ApiRequestFailure(
      response.ok ? "The server returned an invalid response." : `The server is unavailable (HTTP ${response.status}). Please try again.`,
      response.status,
      response.status >= 500,
    );
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const isRecoverable = (error: unknown) =>
  error instanceof ApiRequestFailure && error.allowStale && (error.status === null || error.status >= 500);

const markStale = <T,>(value: ApiResponse<T>, path: string): ApiResponse<T> => {
  window.dispatchEvent(new CustomEvent("api-stale-data", { detail: { path } }));
  return { ...value, meta: { ...(value.meta ?? {}), stale: true } };
};

let refreshInFlight: Promise<{ expiresAt: string } | null> | null = null;

const refreshSession = async () => {
  if (!refreshInFlight) {
    refreshInFlight = fetchOnce(buildUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        const payload = await parseResponse<{ expiresAt: string; csrfToken?: string }>(res);
        if (res.status >= 500) {
          throw new ApiRequestFailure("The session service is temporarily unavailable.", res.status, true, false);
        }
        if (!res.ok || !payload.success) return null;
        const { expiresAt, csrfToken } = payload.data;
        localStorage.setItem("sessionExpiresAt", expiresAt);
        if (csrfToken) {
          localStorage.setItem("csrfToken", csrfToken);
        }
        window.dispatchEvent(new CustomEvent("session-refreshed", { detail: { expiresAt, csrfToken } }));
        return { expiresAt };
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const request = async <T>(method: string, path: string, body?: unknown, params?: Record<string, string | number | undefined>, bypassCache = false) => {
  const url = buildUrl(path, params);
  const requestEpoch = cacheEpoch;
  const cacheKey = `${requestEpoch}:${method}:${url}`;
  const cacheable = method === "GET" && !path.startsWith("/api/auth/");
  let staleEntry: CacheEntry | undefined;
  if (cacheable && !bypassCache) {
    pruneCache();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      cache.delete(cacheKey);
      cache.set(cacheKey, cached);
      window.dispatchEvent(new CustomEvent("api-fresh-data", { detail: { path } }));
      return cached.value as ApiResponse<T>;
    }
    staleEntry = cached;
    if (!navigator.onLine && staleEntry && staleEntry.staleUntil > Date.now()) {
      return markStale(staleEntry.value as ApiResponse<T>, path);
    }
    const existing = inFlight.get(cacheKey);
    if (existing) {
      if (staleEntry && staleEntry.staleUntil > Date.now()) return staleEntry.value as ApiResponse<T>;
      try {
        return (await existing) as ApiResponse<T>;
      } catch (error) {
        if (staleEntry && staleEntry.staleUntil > Date.now() && isRecoverable(error)) {
          return markStale(staleEntry.value as ApiResponse<T>, path);
        }
        throw error;
      }
    }
    if (staleEntry && staleEntry.staleUntil > Date.now()) {
      // Never make a route wait for a refresh when usable cached data exists.
      void request<T>(method, path, body, params, true).catch((error) => {
        // Keep serving the stale copy and make a real server outage visible.
        if (isRecoverable(error)) {
          window.dispatchEvent(new CustomEvent("api-stale-data", { detail: { path } }));
        }
      });
      return staleEntry.value as ApiResponse<T>;
    }
  } else if (!cacheable && !path.startsWith("/api/auth/") && !path.startsWith("/api/metrics/") && path !== "/api/sms/balance") {
    // Writes invalidate their related read models while preserving unrelated route data.
    invalidateApiCache(path);
  }

  const doFetch = () => fetchWithRetry(url, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCookie("csrf_token") || localStorage.getItem("csrfToken") || "",
      },
      body: body ? JSON.stringify(body) : undefined,
    }, method === "GET" && navigator.onLine ? MAX_GET_ATTEMPTS : 1);

  let authenticationRequired = false;
  const fetchPromise = doFetch().then(async (res) => {
    const payload = await parseResponse<T>(res);
    if (!res.ok || !payload.success) {
      if (res.status === 401 || payload.error?.code?.includes("401") || payload.message === "SESSION_EXPIRED") {
        authenticationRequired = true;
        let refreshed: { expiresAt: string } | null;
        try {
          refreshed = await refreshSession();
        } catch {
          authenticationRequired = true;
          throw new ApiRequestFailure("Your session could not be verified because the server is unreachable.", null, true, false);
        }
        if (refreshed) {
          return doFetch().then(async (retryRes) => {
            const retryPayload = await parseResponse<T>(retryRes);
            if (!retryRes.ok || !retryPayload.success) {
              window.dispatchEvent(new CustomEvent("session-expired"));
              throw new ApiRequestFailure(retryPayload.error?.details || retryPayload.message, retryRes.status);
            }
            return retryPayload;
          });
        }
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
      throw new ApiRequestFailure(payload.error?.details || payload.message, res.status, res.status >= 500);
    }
    return payload;
  });

  if (method === "GET") {
    inFlight.set(cacheKey, fetchPromise as Promise<ApiResponse<unknown>>);
  }

  try {
    const payload = await (fetchPromise as Promise<ApiResponse<T>>);
    if (cacheable && requestEpoch === cacheEpoch) {
      cache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        staleUntil: Date.now() + CACHE_TTL_MS + CACHE_STALE_MS,
        path: new URL(url).pathname,
        value: payload as ApiResponse<unknown>,
      });
      window.dispatchEvent(new CustomEvent("api-fresh-data", { detail: { path } }));
      if (bypassCache) window.dispatchEvent(new CustomEvent("api-cache-updated", { detail: { path, data: payload.data } }));
    }
    return payload;
  } catch (error) {
    if (cacheable && !authenticationRequired && staleEntry && staleEntry.staleUntil > Date.now() && isRecoverable(error)) {
      return markStale(staleEntry.value as ApiResponse<T>, path);
    }
    throw error;
  } finally {
    if (method === "GET") {
      inFlight.delete(cacheKey);
    }
  }
};

export const apiGet = <T>(path: string, params?: Record<string, string | number | undefined>) =>
  request<T>("GET", path, undefined, params);
export const apiPost = <T>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPut = <T>(path: string, body?: unknown) => request<T>("PUT", path, body);
export const apiDelete = <T>(path: string) => request<T>("DELETE", path);
