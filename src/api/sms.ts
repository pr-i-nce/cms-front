import { apiGet, apiPost } from "@/lib/api";

export const listSms = (params?: Record<string, string | number | undefined>) =>
  apiGet<any[]>("/api/sms", params);

export const sendSms = (payload: unknown) => apiPost<any>("/api/sms/send", payload);

export const listSmsTemplates = () => apiGet<any[]>("/api/sms/templates");

export const listSmsSegments = () => apiGet<any[]>("/api/sms/segments");


export const getSmsBalance = () => apiPost<any>("/api/sms/balance", {});
