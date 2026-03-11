import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export const listCommittees = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/committees", params);

export const createCommittee = (payload: unknown) => apiPost<any>("/api/committees", payload);

export const getCommittee = (id: string) => apiGet<{ committee: any }>(`/api/committees/${id}`);

export const updateCommittee = (id: string, payload: unknown) =>
  apiPut<any>(`/api/committees/${id}`, payload);

export const deactivateCommittee = (id: string) => apiPost<any>(`/api/committees/${id}/deactivate`);

export const listCommitteeMembers = (id: string, params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>(`/api/committees/${id}/members`, params);

export const addCommitteeMember = (id: string, payload: { memberId: string; role: string }) =>
  apiPost<any>(`/api/committees/${id}/members`, payload);

export const removeCommitteeMember = (id: string, memberId: string) =>
  apiDelete<void>(`/api/committees/${id}/members/${memberId}`);

export const listCommitteeRoles = () => apiGet<string[]>(`/api/committees/roles`);

export const listCommitteeChairs = () => apiGet<any[]>(`/api/committees/chairs`);
