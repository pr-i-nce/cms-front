import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, ready, authUnavailable, refresh } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-7 text-center shadow-xl shadow-primary/5" role="status">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <div><h1 className="font-semibold">Checking your session</h1><p className="mt-1 text-sm text-muted-foreground">This can take a moment on a slow connection.</p></div>
      </div>
    </div>;
  }
  if (authUnavailable) {
    return <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-7 text-center shadow-xl shadow-primary/5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/40 text-primary"><WifiOff className="h-5 w-5" /></div>
        <div><h1 className="text-lg font-semibold">Can’t verify your session</h1><p className="mt-1 text-sm leading-6 text-muted-foreground">The server is taking too long or is temporarily unreachable. Your session has been kept; reconnect and try again.</p></div>
        <Button disabled={retrying || !online} onClick={async () => {
          setRetrying(true);
          try { await refresh(); } finally { setRetrying(false); }
        }} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Checking…" : online ? "Retry connection" : "Waiting for connection"}
        </Button>
      </div>
    </div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
