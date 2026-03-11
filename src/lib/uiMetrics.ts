import { apiPost } from "@/lib/api";

const STORAGE_KEY = "ui-latency-events";
const MAX_EVENTS = 2000;
const MAX_BATCH = 50;
const FLUSH_MS = 4000;

export type UiLatencyEntry = {
  path: string;
  durationMs: number;
  timestamp: string;
};

export const listUiLatency = (): UiLatencyEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const recordUiLatency = (entry: UiLatencyEntry) => {
  if (typeof window === "undefined") return;
  const existing = listUiLatency();
  const next = [entry, ...existing].slice(0, MAX_EVENTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

let queue: UiLatencyEntry[] = [];
let flushTimer: number | null = null;

const flush = async () => {
  if (!queue.length) return;
  const batch = queue.slice(0, MAX_BATCH);
  try {
    await apiPost("/api/metrics/ui-latency", { items: batch });
    queue = queue.slice(batch.length);
  } catch {
    // keep queue to retry on next flush
  }
};

export const enqueueUiLatency = (entry: UiLatencyEntry) => {
  recordUiLatency(entry);
  queue.push(entry);
  if (queue.length > MAX_EVENTS) {
    queue = queue.slice(-MAX_EVENTS);
  }
  if (flushTimer) return;
  flushTimer = window.setTimeout(async () => {
    flushTimer = null;
    await flush();
    if (queue.length) {
      flushTimer = window.setTimeout(async () => {
        flushTimer = null;
        await flush();
      }, FLUSH_MS);
    }
  }, FLUSH_MS);
};
