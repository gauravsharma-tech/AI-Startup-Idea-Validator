import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme";
import { Switch } from "@/components/ui/switch";
import { DISCLAIMER } from "@/lib/engine/config";
import {
  Brain,
  Cpu,
  Info,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
  Sliders,
} from "lucide-react";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function SettingsPage() {
  const user = useCurrentUser();
  const { theme, toggle } = useTheme();

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
          <Sliders className="h-3.5 w-3.5" />
          Preferences & Account
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your founder profile, appearance, and engine configuration.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <section className="bento-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-base">Founder Account</h2>
              <p className="text-xs text-muted-foreground">Active session credentials</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
            <div>
              <span className="text-xs font-medium text-muted-foreground">Display Name</span>
              <p className="font-medium text-sm text-foreground mt-0.5">
                {user?.displayName ?? "Founder User"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground">Primary Email</span>
              <p className="font-medium text-sm text-foreground mt-0.5">
                {user?.primaryEmail ?? "demo@ideavalidator.ai"}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => void signOut("/")}
              className="gap-2 text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* Appearance Card */}
        <section className="bento-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground text-base">Dark Workspace Mode</h2>
                <p className="text-xs text-muted-foreground">
                  Toggle high-contrast obsidian dark palette. Preference saved locally.
                </p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={() => toggle()}
              aria-label="Dark mode toggle"
            />
          </div>
        </section>

        {/* Engine Telemetry Card */}
        <section className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10 text-success border border-success/20">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-foreground text-base">Analysis Engine Specs</h2>
              <p className="text-xs text-muted-foreground">Core AI algorithms and calibration models</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/50 text-xs">
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="text-muted-foreground font-medium">Scoring Engine</span>
              <p className="font-mono font-semibold text-foreground">6-Factor Multi-Attribute Heuristic</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="text-muted-foreground font-medium">Viability Classifier</span>
              <p className="font-mono font-semibold text-foreground">50-Tree Random Forest Ensemble</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="text-muted-foreground font-medium">Location Intelligence</span>
              <p className="font-mono font-semibold text-foreground">OpenStreetMap Overpass + Footfall API</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="text-muted-foreground font-medium">Export Protocol</span>
              <p className="font-mono font-semibold text-foreground">Vector PDF Engine (jsPDF)</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="rounded-xl border border-border/40 bg-muted/20 p-4 flex gap-3 text-xs text-muted-foreground leading-relaxed">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p>{DISCLAIMER}</p>
        </section>
      </div>
    </div>
  );
}
