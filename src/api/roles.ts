import { apiGet } from "@/lib/api";

export const listRoles = () => apiGet<any[]>("/api/roles");

export const getRolePermissions = (id: string) =>
  apiGet<{ permissionIds: string[] }>(`/api/roles/${id}/permissions`);
