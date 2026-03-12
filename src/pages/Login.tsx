import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/api/auth";
import { useAuth } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (!email || !password) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }
    try {
      const res = await login(email, password);
      const user = res.data.user;
      const permissions = Array.isArray(res.data.permissions) ? res.data.permissions : [];
      const csrfToken = res.data.csrfToken || "";
      const expiresAt = res.data.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      setAuth(user, permissions, { token: "", expiresAt, csrfToken });
      toast.success("Login successful!");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(35,91,85,0.08),_transparent_55%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(241,245,249,1)_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div className="w-full grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div>
                <img src="/favicon.ico" alt="Church logo" className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Peniel Christian Church</p>
                <h1 className="text-3xl font-semibold tracking-tight">Church Management Console</h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-lg">
              Manage members, ministries, and communication from one secure workspace.
            </p>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between border bg-white/80 px-4 py-3">
                <span>Member records</span>
                <span className="text-xs font-medium text-foreground">Up to date</span>
              </div>
              <div className="flex items-center justify-between border bg-white/80 px-4 py-3">
                <span>Ministry oversight</span>
                <span className="text-xs font-medium text-foreground">Structured</span>
              </div>
              <div className="flex items-center justify-between border bg-white/80 px-4 py-3">
                <span>SMS communication</span>
                <span className="text-xs font-medium text-foreground">Ready</span>
              </div>
            </div>
          </div>

          <div className="border bg-white/90 p-8 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Welcome</p>
                <h2 className="text-2xl font-semibold">Sign in to continue</h2>
              </div>
              <div className="border px-3 py-1 text-xs text-muted-foreground">Secure</div>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@church.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-input"
                  />
                  Remember me
                </label>
                <button type="button" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </button>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-6 text-xs text-muted-foreground">
              Use your staff account to access church administration tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
