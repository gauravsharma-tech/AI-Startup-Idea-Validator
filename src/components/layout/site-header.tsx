import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { AuthSlot, ThemeToggle } from "./auth-slot";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {[
            { to: "/methodology", label: "How it works" },
            { to: "/sample",      label: "Sample report" },
            { to: "/map",         label: "Location map" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <AuthSlot />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Decision support for founders. Not a market-research firm or a financial forecast.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-sm sm:flex-row sm:gap-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">Product</p>
            <ul className="space-y-1.5">
              {[
                { to: "/methodology", label: "Methodology" },
                { to: "/sample",      label: "Sample report" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">Account</p>
            <ul className="space-y-1.5">
              {[
                { to: "/login",  label: "Sign in" },
                { to: "/signup", label: "Create account" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 px-4 py-4">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} IdeaValidator — initial decision support, not a forecast.
        </p>
      </div>
    </footer>
  );
}
