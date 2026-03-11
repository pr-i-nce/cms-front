import { apiGet } from "@/lib/api";

export const listPermissions = () => apiGet<any[]>("/api/permissions");
