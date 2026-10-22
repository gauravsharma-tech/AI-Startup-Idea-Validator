import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
