import { apiPost, ApiRequestFailure } from "@/lib/api";

const configuredThreshold = import.meta.env.VITE_LATENCY_PERSIST_THRESHOLD_MS;
const parsedThreshold = Number(configuredThreshold);
const PERSIST_THRESHOLD_MS = configuredThreshold && Number.isFinite(parsedThreshold) && parsedThreshold >= 0
  ? parsedThreshold
  : 500;
const MAX_QUEUED_EVENTS = 100;
const MAX_BATCH = 50;
const FLUSH_MS = 4000;

export type UiLatencyEntry = {
  path: string;
  durationMs: number;
  timestamp: string;
};

let queue: UiLatencyEntry[] = [];
let flushTimer: number | null = null;
let queueEpoch = 0;
let consecutiveFailures = 0;

const scheduleFlush = () => {
  if (flushTimer || !queue.length) return;
  flushTimer = window.setTimeout(async () => {
    flushTimer = null;
    await flush();
    scheduleFlush();
  }, FLUSH_MS);
};

const flush = async () => {
  if (!queue.length) return;
  const batch = queue.slice(0, MAX_BATCH);
  const epoch = queueEpoch;
  try {
    await apiPost("/api/metrics/ui-latency", { items: batch });
    if (epoch !== queueEpoch) return;
    queue = queue.slice(batch.length);
    consecutiveFailures = 0;
  } catch (error) {
    if (epoch !== queueEpoch) return;
    if (error instanceof ApiRequestFailure && [401, 403].includes(error.status ?? 0)) {
      clearUiLatencyQueue();
      return;
    }
    consecutiveFailures += 1;
    if (consecutiveFailures >= 2) clearUiLatencyQueue();
  }
};

export const clearUiLatencyQueue = () => {
  queueEpoch += 1;
  queue = [];
  consecutiveFailures = 0;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = null;
};

export const enqueueUiLatency = (entry: UiLatencyEntry) => {
  if (entry.durationMs < PERSIST_THRESHOLD_MS) return;
  queue.push(entry);
  if (queue.length > MAX_QUEUED_EVENTS) {
    queue = queue.slice(-MAX_QUEUED_EVENTS);
  }
  scheduleFlush();
};
