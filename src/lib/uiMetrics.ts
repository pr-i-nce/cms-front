import { apiPost } from "@/lib/api";

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
  if (entry.durationMs < PERSIST_THRESHOLD_MS) return;
  queue.push(entry);
  if (queue.length > MAX_QUEUED_EVENTS) {
    queue = queue.slice(-MAX_QUEUED_EVENTS);
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
