import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FileText,
  GitCompare,
  History,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Settings,
  ScanSearch,
  Sparkles,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./auth-slot";
import { signOut } from "@/lib/auth/client";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/app/validate", label: "Validate an Idea", icon: ScanSearch, highlight: true },
      { to: "/app/history", label: "History", icon: History },
      { to: "/app/compare", label: "Compare Ideas", icon: GitCompare },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/app/reports", label: "Saved Reports", icon: FileText },
      { to: "/app/map", label: "Location Scout", icon: MapIcon },
      { to: "/methodology", label: "Methodology", icon: BookOpen },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to || pathname === to + "/";
  return pathname === to || pathname.startsWith(to + "/") || pathname.startsWith(to + "?");
}

export function AppShell() {
  const { user, isPending } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/20 animate-pulse" />
          <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const userInitials = (user.displayName ?? user.primaryEmail ?? "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <Logo to="/app" />
        </div>

        {/* CTA */}
        <div className="px-3 pt-4 pb-2">
          <Button
            asChild
            size="sm"
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Link to="/app/validate">
              <Sparkles className="size-3.5" />
              Validate an Idea
            </Link>
          </Button>
        </div>

        {/* Nav sections */}
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.to, "exact" in item ? item.exact : false);
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "nav-item group relative",
                          active ? "nav-item-active" : "nav-item-inactive",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                        )}
                        <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <ChevronRight className="size-3.5 text-primary opacity-60" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName ?? "Founder"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.primaryEmail}</p>
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={() => void signOut("/")}
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-h-screen flex-col md:pl-[240px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/90 px-4 backdrop-blur-md md:h-14">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Logo to="/app" className="md:hidden" />

          {/* Breadcrumb / page title area — left intentionally minimal */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="size-4 text-primary/60" />
            <span className="font-medium text-foreground">IdeaValidator</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <nav className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col animate-slide-up">
              <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
                <Logo to="/app" />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
                {NAV_SECTIONS.map((section) => (
                  <div key={section.label}>
                    <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {section.label}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = isActive(pathname, item.to, "exact" in item ? item.exact : false);
                        const Icon = item.icon;
                        return (
                          <li key={item.to}>
                            <Link
                              to={item.to}
                              onClick={() => setMobileOpen(false)}
                              className={cn(
                                "nav-item",
                                active ? "nav-item-active" : "nav-item-inactive",
                              )}
                            >
                              <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="border-t border-sidebar-border p-3">
                <div className="flex items-center gap-3 px-2 py-1.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.displayName ?? "Founder"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{user.primaryEmail}</p>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
