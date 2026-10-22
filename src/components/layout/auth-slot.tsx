import { Link } from "@tanstack/react-router";
import { Moon, Sun, UserRound } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { useTheme } from "./theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

export function AuthSlot({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-11 w-24 animate-pulse rounded-lg bg-muted" />;
  }
  if (user) {
    return (
      <div
        className={
          compact
            ? "flex items-center gap-1 [&_span.text-sm.font-medium]:hidden sm:[&_span.text-sm.font-medium]:inline"
            : "flex items-center gap-1"
        }
      >
        {compact ? null : (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app">
              <UserRound />
              Workspace
            </Link>
          </Button>
        )}
        <UserButton />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/login">Sign in</Link>
      </Button>
      <Button size="sm" className="hidden sm:inline-flex" asChild>
        <Link to="/signup">Create account</Link>
      </Button>
    </div>
  );
}
