import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";

const ConnectionNotice = () => {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [stalePaths, setStalePaths] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const onOffline = () => setOnline(false);
    const onOnline = () => {
      setOnline(true);
      // Offline paths describe the previous network state. Clear them on reconnect;
      // an API failure after reconnect will raise a fresh warning for that endpoint.
      setStalePaths(new Set());
    };
    const onStale = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (path) setStalePaths((current) => new Set(current).add(path));
    };
    const onFresh = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (path) setStalePaths((current) => {
        const next = new Set(current);
        next.delete(path);
        return next;
      });
    };
    const onCacheCleared = () => setStalePaths(new Set());
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("api-stale-data", onStale);
    window.addEventListener("api-fresh-data", onFresh);
    window.addEventListener("api-cache-cleared", onCacheCleared);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("api-stale-data", onStale);
      window.removeEventListener("api-fresh-data", onFresh);
      window.removeEventListener("api-cache-cleared", onCacheCleared);
    };
  }, []);

  if (online && stalePaths.size === 0) return null;
  const offline = !online;
  const Icon = offline ? WifiOff : AlertTriangle;

  return (
    <div className="connection-notice" role="status" aria-live="polite">
      <Icon className="h-4 w-4 shrink-0" />
      <span>{offline
        ? "You’re offline. Cached screens may be out of date; changes need a connection."
        : "The server is slow or unavailable. Showing recently cached information where available."}</span>
    </div>
  );
};

export default ConnectionNotice;
