import { apiGet, apiPost, apiPut } from "@/lib/api";

export const listUsers = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/users", params);

export const createUser = (payload: unknown) => apiPost<any>("/api/users", payload);

export const getUser = (id: string) => apiGet<any>(`/api/users/${id}`);

export const updateUser = (id: string, payload: unknown) => apiPut<any>(`/api/users/${id}`, payload);

export const deactivateUser = (id: string) => apiPost<any>(`/api/users/${id}/deactivate`);

export const resetUserPassword = (id: string) => apiPost<any>(`/api/users/${id}/reset-password`);

export const getUserGroups = (id: string) => apiGet<{ groupIds: string[] }>(`/api/users/${id}/groups`);

export const assignUserGroups = (id: string, payload: { groupIds: string[] }) =>
  apiPut<void>(`/api/users/${id}/groups`, payload);
