import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export const listDepartments = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/departments", params);

export const createDepartment = (payload: unknown) => apiPost<any>("/api/departments", payload);

export const getDepartment = (id: string) => apiGet<{ department: any }>(`/api/departments/${id}`);

export const updateDepartment = (id: string, payload: unknown) =>
  apiPut<any>(`/api/departments/${id}`, payload);

export const deactivateDepartment = (id: string) => apiPost<any>(`/api/departments/${id}/deactivate`);

export const listDepartmentMembers = (id: string, params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>(`/api/departments/${id}/members`, params);

export const addDepartmentMember = (id: string, payload: { memberId: string; role: string }) =>
  apiPost<any>(`/api/departments/${id}/members`, payload);

export const removeDepartmentMember = (id: string, memberId: string) =>
  apiDelete<void>(`/api/departments/${id}/members/${memberId}`);

export const listDepartmentAssignments = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>(`/api/departments/members/assignments`, params);

export const listDepartmentRoles = () => apiGet<string[]>(`/api/departments/roles`);

export const listDepartmentHeads = () => apiGet<any[]>(`/api/departments/heads`);
