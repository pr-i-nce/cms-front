import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { me } from "@/api/auth";
import { getApiBaseUrl } from "@/lib/apiBase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth, setAuth, setReady, setSessionExpired } from "@/store/authSlice";

type Member = {
  id: string;
  name: string;
  role?: string;
  email: string;
  status: string;
};

type AuthContextValue = {
  user: Member | null;
  permissions: string[];
  ready: boolean;
  setAuth: (user: Member, permissions: string[], session: { token: string; expiresAt: string; csrfToken?: string }) => void;
  clearAuth: () => void;
  refresh: () => Promise<void>;
  sessionExpired: boolean;
  acknowledgeSessionExpired: () => void;
};

const Context = createContext<AuthContextValue | null>(null);

const LOCAL_USER_KEY = "userId";
const LOCAL_PERM_KEY = "permissions";
const LOCAL_EXPIRES_KEY = "sessionExpiresAt";
const LOCAL_CSRF_KEY = "csrfToken";
const API_BASE_URL = getApiBaseUrl();
const SESSION_CHECK_TIMEOUT_MS = 5000;

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
  const sessionExpired = useAppSelector((state) => state.auth.sessionExpired);

  const setAuthState = (nextUser: Member, nextPermissions: string[], session: { token: string; refreshToken?: string; expiresAt: string; csrfToken?: string }) => {
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("refreshToken");
    localStorage.setItem(LOCAL_USER_KEY, nextUser.id);
    localStorage.setItem(LOCAL_PERM_KEY, nextPermissions.join(","));
    localStorage.setItem(LOCAL_EXPIRES_KEY, session.expiresAt);
    if (session.csrfToken) {
      localStorage.setItem(LOCAL_CSRF_KEY, session.csrfToken);
    }
    dispatch(setAuth({ user: nextUser, permissions: nextPermissions, token: session.token, expiresAt: session.expiresAt }));
  };

  const clearAuthState = () => {
    localStorage.removeItem(LOCAL_USER_KEY);
    localStorage.removeItem(LOCAL_PERM_KEY);
    localStorage.removeItem("sessionToken");
    localStorage.removeItem(LOCAL_EXPIRES_KEY);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem(LOCAL_CSRF_KEY);
    dispatch(clearAuth());
  };

  const scheduleExpiry = (expiresAt?: string | null) => {
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
  };

  const refresh = async () => {
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    const storedUser = localStorage.getItem(LOCAL_USER_KEY);
    if (!storedExpiry && !storedUser) {
      dispatch(setReady(true));
      return;
    }
    if (storedExpiry) {
      const expired = Date.now() >= new Date(storedExpiry).getTime();
      if (expired) {
        try {
          const response = await withTimeout(fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({}),
          }), SESSION_CHECK_TIMEOUT_MS);
          const payload = await response.json();
          if (response.ok && payload?.success) {
            const { expiresAt, csrfToken } = payload.data || {};
            if (expiresAt) {
              localStorage.setItem(LOCAL_EXPIRES_KEY, expiresAt);
              if (csrfToken) localStorage.setItem(LOCAL_CSRF_KEY, csrfToken);
              if (user) {
                setAuthState(user, permissions, { token: "", expiresAt, csrfToken });
              }
              return;
            }
          }
        } catch {
          // fall through to expire
        }
        dispatch(setSessionExpired(true));
        clearAuthState();
        return;
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
    } catch (err) {
      dispatch(setSessionExpired(true));
      clearAuthState();
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    scheduleExpiry(storedExpiry);
    const handler = () => {
      dispatch(setSessionExpired(true));
      clearAuthState();
    };
    const refreshedHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { expiresAt: string; csrfToken?: string } | undefined;
      if (!detail || !user) return;
      setAuthState(user, permissions, { token: "", expiresAt: detail.expiresAt, csrfToken: detail.csrfToken });
    };
    window.addEventListener("session-expired", handler);
    window.addEventListener("session-refreshed", refreshedHandler);
    return () => {
      if (expiryTimerRef.current) window.clearTimeout(expiryTimerRef.current);
      window.removeEventListener("session-expired", handler);
      window.removeEventListener("session-refreshed", refreshedHandler);
    };
  }, []);

  useEffect(() => {
    const storedExpiry = localStorage.getItem(LOCAL_EXPIRES_KEY);
    scheduleExpiry(storedExpiry);
  }, [user]);

  const acknowledgeSessionExpired = () => dispatch(setSessionExpired(false));

  const value = useMemo(
    () => ({
      user,
      permissions,
      ready,
      setAuth: setAuthState,
      clearAuth: clearAuthState,
      refresh,
      sessionExpired,
      acknowledgeSessionExpired,
    }),
    [user, permissions, ready, sessionExpired],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
};
