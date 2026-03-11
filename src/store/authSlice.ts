import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  id: string;
  name: string;
  role?: string;
  email: string;
  status: string;
};

type AuthState = {
  user: AuthUser | null;
  permissions: string[];
  ready: boolean;
  sessionExpired: boolean;
  token: string | null;
  expiresAt: string | null;
};

const initialState: AuthState = {
  user: null,
  permissions: [],
  ready: false,
  sessionExpired: false,
  token: null,
  expiresAt: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        user: AuthUser;
        permissions: string[];
        token: string;
        expiresAt: string;
      }>,
    ) => {
      state.user = action.payload.user;
      state.permissions = action.payload.permissions;
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt;
      state.ready = true;
      state.sessionExpired = false;
    },
    clearAuth: (state) => {
      state.user = null;
      state.permissions = [];
      state.token = null;
      state.expiresAt = null;
      state.ready = true;
    },
    setReady: (state, action: PayloadAction<boolean>) => {
      state.ready = action.payload;
    },
    setSessionExpired: (state, action: PayloadAction<boolean>) => {
      state.sessionExpired = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setReady, setSessionExpired } = authSlice.actions;
export default authSlice.reducer;
