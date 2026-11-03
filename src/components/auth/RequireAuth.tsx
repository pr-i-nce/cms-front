import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/useAuth";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, ready, authUnavailable } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-7 text-center shadow-xl shadow-primary/5" role="status">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <div>
            <h1 className="font-semibold">Checking your session</h1>
            <p className="mt-1 text-sm text-muted-foreground">This can take a moment on a slow connection.</p>
          </div>
        </div>
      </div>
    );
  }

  if (authUnavailable || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ reason: authUnavailable ? "session-unverified" : "session-required" }}
      />
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
