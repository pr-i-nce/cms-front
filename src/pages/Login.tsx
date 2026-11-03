import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/api/auth";
import { useAuth } from "@/lib/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionUnverified = (location.state as { reason?: string } | null)?.reason === "session-unverified";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password to continue.");
      return;
    }
    setLoading(true);
    try {
      const response = await login(email.trim(), password);
      const user = response.data.user;
      const permissions = Array.isArray(response.data.permissions) ? response.data.permissions : [];
      const csrfToken = response.data.csrfToken || "";
      const expiresAt = response.data.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      setAuth(user, permissions, { token: "", expiresAt, csrfToken });
      toast.success("Welcome back.");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn’t sign you in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell min-h-[100svh] px-3 py-3 sm:px-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100svh-1.5rem)] w-full max-w-6xl grid-cols-1 items-center gap-5 lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.06fr_0.94fr] lg:gap-6">
        <section className="login-panel hidden min-h-[640px] flex-col justify-between border-l-[3px] border-accent px-8 py-10 lg:flex xl:px-12 xl:py-12">
          <div className="flex items-center gap-5">
            <img src="/church-logo.png" alt="Peniel Christian Church logo" className="h-20 w-20 shrink-0 object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Peniel Christian Church</p>
              <p className="mt-1 text-sm text-muted-foreground">Church office · Kitui</p>
            </div>
          </div>

          <div className="max-w-lg py-12">
            <p className="eyebrow">Church management</p>
            <h1 className="mt-4 max-w-md text-5xl font-medium leading-[1.12] tracking-tight text-foreground xl:text-6xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Serving our church, with care.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              One place for membership, ministries, and communication across the church.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 bg-accent" />
            <p>“Face to face with God” <span className="text-foreground/60">· Genesis 32:30</span></p>
          </div>
        </section>

        <section className="login-card flex min-h-[calc(100svh-1.5rem)] items-center px-5 py-6 backdrop-blur sm:min-h-0 sm:p-10 lg:min-h-[640px] lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex w-fit items-center gap-3 lg:hidden">
              <img src="/church-logo.png" alt="Peniel Christian Church logo" className="h-12 w-12 object-contain" />
              <span className="pr-1 text-sm font-semibold leading-tight text-foreground">
                Peniel Christian Church
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Church office workspace</span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Welcome back</p>
                <h2 className="page-title mt-1 text-3xl sm:text-4xl">Sign in</h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Use your staff account to continue caring for your church.</p>
                {sessionUnverified && (
                  <p className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
                    We couldn’t verify your session. Please sign in again to continue.
                  </p>
                )}
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Staff portal
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-7 space-y-4 sm:mt-9 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@church.org"
                  autoComplete="username"
                  className="login-input h-12 rounded-xl"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="login-input h-12 rounded-xl pr-12"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 py-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="rounded border-input"
                  />
                  Remember me
                </label>
                <span className="text-right text-xs text-muted-foreground">Need access help? Contact your church administrator.</span>
              </div>

              <Button type="submit" className="mt-2 h-12 w-full gap-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/15" disabled={loading}>
                {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-6 border-t border-border/70 pt-4 text-center text-xs leading-5 text-muted-foreground sm:mt-7 sm:pt-5">
              Access is reserved for authorized church staff. Account activity is protected and audited.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
