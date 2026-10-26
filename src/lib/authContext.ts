import { createContext } from "react";

export type Member = {
  id: string;
  name: string;
  role?: string;
  email: string;
  status: string;
};

export type AuthContextValue = {
  user: Member | null;
  permissions: string[];
  ready: boolean;
  authUnavailable: boolean;
  setAuth: (user: Member, permissions: string[], session: { token: string; expiresAt: string; csrfToken?: string }) => void;
  clearAuth: () => void;
  refresh: () => Promise<void>;
  sessionExpired: boolean;
  acknowledgeSessionExpired: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
