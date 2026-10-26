import { useCallback, useEffect, useMemo, useRef } from "react";
import { me } from "@/api/auth";
import { ApiRequestFailure, clearApiCache } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBase";
import { AuthContext, type Member } from "@/lib/authContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth, setAuth, setAuthUnavailable, setReady, setSessionExpired } from "@/store/authSlice";

const LOCAL_USER_KEY = "userId";
const LOCAL_PERM_KEY = "permissions";
const LOCAL_EXPIRES_KEY = "sessionExpiresAt";
const LOCAL_CSRF_KEY = "csrfToken";
const API_BASE_URL = getApiBaseUrl();
const SESSION_CHECK_TIMEOUT_MS = 32_000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: number | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Session check timed out")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const expiryTimerRef = useRef<number | null>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const permissions = useAppSelector((state) => state.auth.permissions);
  const ready = useAppSelector((state) => state.auth.ready);
  const authUnavailable = useAppSelector((state) => state.auth.authUnavailable);
  const sessionExpired = useAppSelector((state) => state.auth.sessionExpired);
  const authSnapshotRef = useRef({ user, permissions });

  useEffect(() => {
    authSnapshotRef.current = { user, permissions };
  }, [user, permissions]);

  const setAuthState = useCallback((nextUser: Member, nextPermissions: string[], session: { token: string; refreshToken?: string; expiresAt: string; csrfToken?: string }) => {
    authSnapshotRef.current = { user: nextUser, permissions: nextPermissions };
    const previousUserId = localStorage.getItem(LOCAL_USER_KEY);
    if (previousUserId && previousUserId !== nextUser.id) clearApiCache();
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("refreshToken");
    localStorage.setItem(LOCAL_USER_KEY, nextUser.id);
    localStorage.setItem(LOCAL_PERM_KEY, nextPermissions.join(","));
    localStorage.setItem(LOCAL_EXPIRES_KEY, session.expiresAt);
    if (session.csrfToken) {
      localStorage.setItem(LOCAL_CSRF_KEY, session.csrfToken);
    }
    dispatch(setAuth({ user: nextUser, permissions: nextPermissions, token: session.token, expiresAt: session.expiresAt }));
  }, [dispatch]);

  const clearAuthState = useCallback(() => {
    authSnapshotRef.current = { user: null, permissions: [] };
    clearApiCache();
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_PERM_KEY);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem(LOCAL_EXPIRES_KEY);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem(LOCAL_CSRF_KEY);
    dispatch(clearAuth());
  }, [dispatch]);

  const scheduleExpiry = useCallback((expiresAt?: string | null) => {
    if (expiryTimerRef.current) window.clearTimeout(expiryTimerRef.current);
    if (!expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      dispatch(setSessionExpired(true));
      clearAuthState();
      return;
    }
    expiryTimerRef.current = window.setTimeout(() => {
      dispatch(setSessionExpired(true));
      clearAuthState();
    }, ms);
  }, [clearAuthState, dispatch]);

  const refresh = useCallback(async () => {
    if (!authSnapshotRef.current.user) {
      dispatch(setReady(false));
      dispatch(setAuthUnavailable(false));
    }
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    const storedUser = localStorage.getItem(LOCAL_USER_KEY);
    if (!storedExpiry && !storedUser) {
      dispatch(setReady(true));
      return;
    }
    if (storedExpiry) {
      const expiryTime = new Date(storedExpiry).getTime();
      const expired = !Number.isFinite(expiryTime) || Date.now() >= expiryTime;
      if (expired) {
        try {
          const { response, payload } = await withTimeout(
            fetch(`${API_BASE_URL}/api/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            }).then(async (result) => ({ response: result, payload: await result.json().catch(() => null) })),
            SESSION_CHECK_TIMEOUT_MS,
          );
          if (response.ok && payload?.success) {
            const { expiresAt, csrfToken } = payload.data || {};
            if (expiresAt) {
              localStorage.setItem(LOCAL_EXPIRES_KEY, expiresAt);
              if (csrfToken) localStorage.setItem(LOCAL_CSRF_KEY, csrfToken);
            } else {
              dispatch(setSessionExpired(true));
              clearAuthState();
              return;
            }
          } else if (response.status >= 500) {
            dispatch(setAuthUnavailable(true));
            dispatch(setReady(true));
            return;
          } else {
            dispatch(setSessionExpired(true));
            clearAuthState();
            return;
          }
        } catch (error) {
          if (error instanceof ApiRequestFailure || error instanceof TypeError || (error instanceof Error && error.message.includes("timed out"))) {
            dispatch(setAuthUnavailable(true));
            dispatch(setReady(true));
            return;
          }
          dispatch(setSessionExpired(true));
          clearAuthState();
          return;
        }
      }
    }
    try {
      const response = await withTimeout(me(), SESSION_CHECK_TIMEOUT_MS);
      const expiresAt = localStorage.getItem(LOCAL_EXPIRES_KEY) || "";
      if (!expiresAt) {
        dispatch(setSessionExpired(true));
        clearAuthState();
        return;
      }
      const csrfToken = localStorage.getItem(LOCAL_CSRF_KEY) || undefined;
      setAuthState(response.data.user, response.data.permissions ?? [], { token: "", expiresAt, csrfToken });
    } catch (error) {
      if (
        (error instanceof ApiRequestFailure && (error.status === null || error.status >= 500)) ||
        error instanceof TypeError ||
        (error instanceof Error && error.message.includes("timed out"))
      ) {
        // Keep the HttpOnly session cookie and ask the user to retry when the
        // network or API recovers. Never trust local permissions to render data.
        dispatch(setAuthUnavailable(true));
        dispatch(setReady(true));
        return;
      }
      dispatch(setSessionExpired(true));
      clearAuthState();
    }
  }, [clearAuthState, dispatch, setAuthState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    scheduleExpiry(storedExpiry);
    const handler = () => {
      dispatch(setSessionExpired(true));
      clearAuthState();
    };
    const refreshedHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { expiresAt: string; csrfToken?: string } | undefined;
      const current = authSnapshotRef.current;
      if (!detail || !current.user) return;
      setAuthState(current.user, current.permissions, { token: "", expiresAt: detail.expiresAt, csrfToken: detail.csrfToken });
    };
    window.addEventListener("session-expired", handler);
    window.addEventListener("session-refreshed", refreshedHandler);
    return () => {
      if (expiryTimerRef.current) window.clearTimeout(expiryTimerRef.current);
      window.removeEventListener("session-expired", handler);
      window.removeEventListener("session-refreshed", refreshedHandler);
    };
  }, [clearAuthState, dispatch, scheduleExpiry, setAuthState]);

  useEffect(() => {
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    scheduleExpiry(storedExpiry);
  }, [scheduleExpiry, user]);

  const acknowledgeSessionExpired = useCallback(() => dispatch(setSessionExpired(false)), [dispatch]);

  const value = useMemo(
    () => ({
      user,
      permissions,
      ready,
      authUnavailable,
      setAuth: setAuthState,
      clearAuth: clearAuthState,
      refresh,
      sessionExpired,
      acknowledgeSessionExpired,
    }),
    [user, permissions, ready, authUnavailable, sessionExpired, setAuthState, clearAuthState, refresh, acknowledgeSessionExpired],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
