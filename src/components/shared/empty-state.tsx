import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type ActionTo = "/app/validate" | "/app/history";

export function EmptyState({
  title,
  body,
  actionLabel = "Validate Your First Idea",
  actionTo = "/app/validate",
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: ActionTo;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-8 shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <Button asChild>
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
