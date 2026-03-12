import { apiGet, apiPost } from "@/lib/api";

export const login = (email: string, password: string) =>
  apiPost<{ user: any; permissions: string[]; csrfToken?: string; expiresAt: string }>(
    "/api/auth/login",
    
    { email, password },
  );
 
export const refresh = () =>
  apiPost<{ csrfToken?: string; expiresAt: string }>("/api/auth/refresh", {});

export const logout = () => apiPost<void>("/api/auth/logout");

export const me = () => apiGet<{ user: any; permissions: string[] }>("/api/auth/me");
