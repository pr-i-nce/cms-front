import { apiGet } from "@/lib/api";

export const getReportSummary = () => apiGet<any>("/api/reports/summary");

export const getDashboardSummary = () => apiGet<any>("/api/reports/dashboard");

export const getDashboardFull = () => apiGet<any>("/api/reports/dashboard-full");

export const getSlowRequests = () => apiGet<any>("/api/metrics/slow-requests");

export const getRequestMetrics = (params?: Record<string, string | number | undefined>) =>
  apiGet<any>("/api/metrics/requests", params);

export const getUiLatency = (params?: Record<string, string | number | undefined>) =>
  apiGet<any>("/api/metrics/ui-latency", params);
