import { apiGet } from "@/lib/api";

export const listActivities = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/activities", params);
