import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";
import { verdictTone } from "./utils";

export function verdictBadgeVariant(
  verdict: string | null,
): NonNullable<VariantProps<typeof badgeVariants>["variant"]> {
  const tone = verdictTone(verdict ?? "");
  if (tone === "success") return "success";
  if (tone === "primary") return "default";
  if (tone === "warning") return "warning";
  return "danger";
}
