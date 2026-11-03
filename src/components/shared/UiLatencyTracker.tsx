import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { clearUiLatencyQueue, enqueueUiLatency } from "@/lib/uiMetrics";
import { useAuth } from "@/lib/useAuth";

const UiLatencyTracker = () => {
  const location = useLocation();
  const { user, ready } = useAuth();
  const isAuthenticated = Boolean(user);
  const userId = user?.id;

  useEffect(() => {
    if (!ready || !isAuthenticated || location.pathname === "/login") {
      clearUiLatencyQueue();
      return;
    }
    const start = performance.now();
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const durationMs = Math.round(performance.now() - start);
        enqueueUiLatency({
          path: location.pathname,
          durationMs,
          timestamp: new Date().toISOString(),
        });
      });
    });
    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [location.pathname, ready, isAuthenticated, userId]);

  return null;
};

export default UiLatencyTracker;
