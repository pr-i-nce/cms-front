import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export const listBranches = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/branches", params);

export const getBranch = (id: string) => apiGet<any>(`/api/branches/${id}`);

export const createBranch = (payload: unknown) => apiPost<any>("/api/branches", payload);

export const updateBranch = (id: string, payload: unknown) => apiPut<any>(`/api/branches/${id}`, payload);

export const deactivateBranch = (id: string) => apiPost<any>(`/api/branches/${id}/deactivate`);

export const listBranchPastors = (id: string) => apiGet<any[]>(`/api/branches/${id}/pastors`);

export const addBranchPastor = (id: string, payload: { memberId: string; role?: string }) =>
  apiPost<any>(`/api/branches/${id}/pastors`, payload);

export const removeBranchPastor = (id: string, memberId: string) =>
  apiDelete<void>(`/api/branches/${id}/pastors/${memberId}`);

export const listBranchPastorAssignments = () => apiGet<any[]>(`/api/branches/pastors`);
