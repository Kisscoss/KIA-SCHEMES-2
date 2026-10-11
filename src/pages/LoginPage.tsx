import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, isAuthConfigured } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

type Mode = "signin" | "signup";

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
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    if (mode === "signup" && !name.trim()) {
      toast.error("Enter your name to create an account.");
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
      const message = getErrorMessage(result);
      if (message) {
        toast.error(message);
        return;
      }
      await refresh();
      toast.success(mode === "signup" ? "Account created. Welcome!" : "Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isAuthConfigured) {
      toast.error("Auth is not configured. Set VITE_NEON_AUTH_URL in .env.");
      return;
    }
    setGoogleLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}${from}`,
      });
      const message = getErrorMessage(result);
      if (message) toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hero-gradient relative hidden flex-1 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
            <BookOpen className="h-5 w-5 text-accent" />
          </span>
          <span className="font-display text-xl font-bold text-primary-foreground">
            KIA Schemes
          </span>
        </Link>
        <div className="relative z-10">
          <h2 className="mb-4 font-display text-4xl font-bold leading-tight text-primary-foreground">
            Plan smarter.
            <br />
            Teach better.
          </h2>
          <p className="max-w-md font-body text-lg text-primary-foreground/75">
            Sign in to generate AI-powered Schemes of Work for your classes in
            minutes - outcomes, resources, and methodologies included.
          </p>
        </div>
        <p className="relative z-10 font-body text-sm text-primary-foreground/60">
          (c) {new Date().getFullYear()} KIA Schemes. Built for educators.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-lg font-bold">KIA Schemes</span>
            </Link>
          </div>

          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mb-8 font-body text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue generating schemes."
              : "Sign up to start generating schemes."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mb-6 w-full py-6"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with Google
          </Button>

          <div className="mb-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">
              or with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  placeholder="Jane Namono"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="gold-gradient w-full border-0 py-6 font-semibold text-accent-foreground"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
