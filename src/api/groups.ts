import { apiGet, apiPost, apiPut } from "@/lib/api";

export const listGroups = () => apiGet<any[]>("/api/groups");

export const createGroup = (payload: unknown) => apiPost<any>("/api/groups", payload);

export const updateGroup = (id: string, payload: unknown) => apiPut<any>(`/api/groups/${id}`, payload);

export const getGroupRoles = (id: string) => apiGet<{ roleIds: string[] }>(`/api/groups/${id}/roles`);

export const assignGroupRoles = (id: string, payload: { roleIds: string[] }) =>
  apiPut<void>(`/api/groups/${id}/roles`, payload);
