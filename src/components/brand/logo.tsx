import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 12.2l2.4 2.4L16.2 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-base tracking-tight sm:text-lg">
        Idea<span className="text-primary">Validator</span>
      </span>
    </Link>
  );
}
