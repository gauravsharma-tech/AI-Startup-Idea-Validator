import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, signInAsDemo } from "@/lib/auth/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { Sparkles, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  // 1-Click Fast Demo Login for instant access
  async function onQuickDemo() {
    setError(null);
    setDemoPending(true);
    try {
      const res = await signInAsDemo();
      if (res.success) {
        await navigate({ to: "/app" });
      } else {
        setError(res.error || "Quick login failed. Please sign in below.");
      }
    } catch (err: any) {
      setError(err?.message || "Quick login failed.");
    } finally {
      setDemoPending(false);
    }
  }

  // Easy Email/Password login: auto-registers if new
  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (password.length < 3) {
      setError("Password must be at least 3 characters.");
      return;
    }
    setPending(true);
    try {
      const { error: err } = await authClient.signIn.email({ email, password });
      if (!err) {
        await navigate({ to: "/app" });
        return;
      }

      // If user doesn't exist yet, auto-create
      const name = email.split("@")[0] || "Idea Founder";
      const { error: regErr } = await authClient.signUp.email({ name, email, password });
      if (!regErr) {
        await navigate({ to: "/app" });
        return;
      }

      setError(err.message ?? regErr.message ?? "Could not sign in. Check details.");
    } catch (err: any) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <SiteHeader />
      <main className="relative mx-auto grid min-h-[75vh] w-full max-w-md place-items-center px-4 py-12 animate-fade-in">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative w-full space-y-6 bento-card p-8 shadow-xl">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <ShieldCheck className="h-3 w-3" /> Secure Workspace
            </span>
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in with 1-click Demo or enter any email & password.
            </p>
          </div>

          {/* 1-Click Fast Login Button */}
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-95 text-primary-foreground font-semibold py-2.5 flex items-center justify-center gap-2 shadow-md"
              onClick={onQuickDemo}
              disabled={demoPending || pending}
            >
              <Sparkles className="h-4 w-4" />
              {demoPending ? "Connecting to Workspace…" : "1-Click Instant Demo Login"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Instant access pre-loaded with sample startup data
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border/60" />
            or sign in with credentials
            <span className="h-px flex-1 bg-border/60" />
          </div>

          <form className="space-y-4" onSubmit={onEmail}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="founder@venture.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <span className="text-[10px] text-muted-foreground">Min 3 chars</span>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                required
                minLength={3}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                First time? Submitting will automatically create your account.
              </p>
            </div>
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-2.5 text-xs text-danger">
                {error}
              </div>
            )}
            <Button
              type="submit"
              id="login-submit"
              className="w-full h-9 font-medium"
              variant="outline"
              disabled={pending || demoPending}
            >
              {pending ? "Signing in…" : "Sign In / Auto-Register"}
            </Button>
          </form>

          <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Create new account
            </Link>
            <button
              type="button"
              onClick={onQuickDemo}
              className="flex items-center gap-1 text-primary hover:underline font-medium"
            >
              Continue as Guest <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
