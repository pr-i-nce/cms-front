import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="p-8 text-center text-muted-foreground">Checking session...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
