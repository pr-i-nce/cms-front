import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { enqueueUiLatency } from "@/lib/uiMetrics";

const UiLatencyTracker = () => {
  const location = useLocation();

  useEffect(() => {
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
  }, [location.pathname]);

  return null;
};

export default UiLatencyTracker;
