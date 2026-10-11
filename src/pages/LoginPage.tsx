import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, isAuthConfigured } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

function getErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const err = (result as { error?: { message?: string } | string }).error;
  if (!err) return null;
  if (typeof err === "string") return err;
  return err.message ?? "Authentication failed";
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/create";

  if (user) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthConfigured) {
      toast.error("Auth is not configured. Set VITE_NEON_AUTH_URL in .env.");
      return;
    }
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password });
      const message = getErrorMessage(result);
      if (message) {
        toast.error(message);
        return;
      }
      await refresh();
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      {/* Brand panel */}
      <div className="hero-gradient relative hidden flex-1 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-accent/25" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border border-accent/20" />
        <div className="pointer-events-none absolute bottom-24 -left-16 h-56 w-56 rounded-full border border-primary-foreground/10" />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/10 shadow-inner backdrop-blur-sm ring-1 ring-primary-foreground/20">
            <BookOpen className="h-5 w-5 text-accent" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-primary-foreground">
            KIA Schemes
          </span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="gold-gradient inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
            <span className="font-body text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              AI-Powered Planning
            </span>
          </div>
          <h2 className="font-display text-5xl font-bold leading-[1.1] text-primary-foreground">
            Plan smarter.
            <br />
            <span className="text-accent">Teach better.</span>
          </h2>
          <p className="max-w-md font-body text-lg leading-relaxed text-primary-foreground/75">
            Sign in to generate complete Schemes of Work for Ugandan secondary
            schools - learning outcomes, resources, and methodologies in minutes.
          </p>

          <div className="grid max-w-md grid-cols-1 gap-3">
            {[
              { icon: Sparkles, text: "AI auto-fills outcomes, resources & methodology" },
              { icon: GraduationCap, text: "Aligned to NCDC curriculum standards" },
              { icon: ShieldCheck, text: "Your schemes stay private to your account" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-4 py-3 backdrop-blur-sm ring-1 ring-primary-foreground/15"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 ring-1 ring-accent/30">
                  <item.icon className="h-4 w-4 text-accent" />
                </span>
                <span className="font-body text-sm text-primary-foreground/90">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 font-body text-sm text-primary-foreground/60">
          (c) {new Date().getFullYear()} KIA Schemes. Built for educators.
        </p>
      </div>
      {/* Form panel */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary ring-1 ring-primary/30">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-bold">KIA Schemes</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <div className="mb-6 flex items-center gap-3">
              <span className="gold-gradient flex h-11 w-11 items-center justify-center rounded-xl shadow-soft ring-1 ring-accent/30">
                <GraduationCap className="h-5 w-5 text-accent-foreground" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Welcome back
                </h1>
                <p className="font-body text-sm text-muted-foreground">
                  Sign in to continue generating schemes
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="py-6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="........"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="py-6 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="gold-gradient w-full border-0 py-6 font-body text-base font-semibold text-accent-foreground shadow-soft transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center font-body text-xs text-muted-foreground">
            Access is for KIA Schemes members. Contact your administrator for an
            account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
