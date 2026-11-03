import { apiGet, apiPost, resetAuthRequestState } from "@/lib/api";
import type { Member } from "@/lib/authContext";

export const login = (email: string, password: string) => {
  resetAuthRequestState();
  return apiPost<{ user: Member; permissions: string[]; csrfToken?: string; expiresAt: string }>(
    "/api/auth/login",
    { email, password },
  );
};
 
export const refresh = () =>
  apiPost<{ csrfToken?: string; expiresAt: string }>("/api/auth/refresh", {});

export const logout = () => {
  resetAuthRequestState();
  return apiPost<void>("/api/auth/logout");
};

export const me = () => apiGet<{ user: Member; permissions: string[] }>("/api/auth/me");
