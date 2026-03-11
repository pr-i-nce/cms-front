import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export const listMembers = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/members", params);

export const lookupMembers = (q: string) =>
  apiGet<any[]>("/api/members/lookup", { q });

export const createMember = (payload: unknown) => apiPost<any>("/api/members", payload);

export const getMember = (id: string) => apiGet<any>(`/api/members/${id}`);

export const updateMember = (id: string, payload: unknown) => apiPut<any>(`/api/members/${id}`, payload);

export const deleteMember = (id: string) => apiDelete<void>(`/api/members/${id}`);

export const listPastors = () => apiGet<any[]>(`/api/members/pastors`);
