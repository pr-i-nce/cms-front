import { apiGet, apiPost } from "@/lib/api";

export type SmsRecord = {
  id: string;
  message: string;
  recipients: string;
  recipientCount: number;
  date: string;
  status: "Delivered" | "Pending" | "Failed" | "Sent";
  recipientType: string;
  providerStatus?: string | null;
  providerCode?: string | null;
  providerMessage?: string | null;
  providerResponse?: string | null;
  audit?: {
    createdBy: string;
    createdAt: string;
    lastEditedBy: string;
    lastEditedAt: string;
    sentBy?: string | null;
  } | null;
};

export type SmsTemplate = { label: string; body: string };
export type SmsSegment = { key: string; label: string; count: number; memberIds: string[] };

export const listSms = (params?: Record<string, string | number | undefined>) =>
  apiGet<SmsRecord[]>("/api/sms", params);

export const sendSms = (payload: unknown) => apiPost<SmsRecord>("/api/sms/send", payload);

export const isSmsProviderFailure = (record: unknown) => {
  if (!record || typeof record !== "object") return false;
  const result = record as { status?: unknown; providerStatus?: unknown };
  const status = String(result.status || "").trim().toLowerCase();
  const providerStatus = String(result.providerStatus || "").trim().toLowerCase();
  return status === "failed" || ["failed", "failure", "network_error", "error"].includes(providerStatus);
};

export const listSmsTemplates = () => apiGet<SmsTemplate[]>("/api/sms/templates");

export const listSmsSegments = () => apiGet<SmsSegment[]>("/api/sms/segments");


export const getSmsBalance = () => apiPost<{ credit: string | number | null; raw?: unknown }>("/api/sms/balance", {});
