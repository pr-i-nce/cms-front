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
    <div className="login-shell min-h-screen px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-stretch gap-5 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="login-panel relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[2rem] p-7 text-white sm:p-10 lg:min-h-[620px]">
            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full border border-[#e0c789]/20" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#e0c789]/20" />
            <div className="relative space-y-10">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-1.5 shadow-lg">
                  <img src="/pwa-192.png" alt="Church logo" className="h-10 w-10 rounded-xl" />
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.23em] text-[#e0c789]">Peniel Christian Church</p>
                  <p className="mt-1 text-sm font-medium text-white/70">Administration workspace</p>
                </div>
              </div>
              <div className="max-w-xl space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e0c789]">Faithful stewardship</p>
                <h1 className="max-w-lg text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  One trusted place to care for your church.
                </h1>
                <p className="max-w-md text-sm leading-7 text-white/65 sm:text-base">
                  A thoughtful workspace for people, ministries, and the connections that help your community thrive.
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                {[["01", "People"], ["02", "Ministries"], ["03", "Community"]].map(([number, title]) => (
                  <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <span className="text-[0.62rem] font-semibold tracking-[0.16em] text-[#e0c789]">{number}</span>
                    <p className="mt-2 font-medium text-white/90">{title}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="relative mt-8 text-xs tracking-wide text-white/40">A secure, connected church office.</p>
          </div>

          <div className="login-card flex items-center rounded-[2rem] p-6 backdrop-blur sm:p-10 lg:p-12">
            <div className="w-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Welcome back</p>
                <h2 className="page-title mt-2 text-3xl">Sign in</h2>
                <p className="mt-2 text-sm text-muted-foreground">Enter your staff account details to continue.</p>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Secure access
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-9 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@church.org"
                  autoComplete="username"
                  className="h-12 rounded-xl bg-white/70"
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
                    autoComplete="current-password"
                    className="h-12 rounded-xl bg-white/70 pr-11"
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

              <Button type="submit" className="mt-2 h-12 w-full gap-2 rounded-xl text-sm shadow-lg shadow-primary/15" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-7 border-t border-border/70 pt-5 text-center text-xs leading-5 text-muted-foreground">
              Access is reserved for authorized church staff. Your account activity is protected and audited.
            </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
