import { useEffect, useState } from "react";
import { cn, verdictTone } from "@/lib/utils";

export function ScoreGauge({
  score,
  verdict,
  size = 180,
}: {
  score: number;
  verdict: string;
  size?: number;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(score);
      return;
    }
    const start = performance.now();
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const r = 62;
  const c = 2 * Math.PI * r;
  const offset = c - (shown / 100) * c;
  const tone = verdictTone(verdict);
  const stroke =
    tone === "success"
      ? "stroke-success"
      : tone === "primary"
        ? "stroke-primary"
        : tone === "warning"
          ? "stroke-warning"
          : "stroke-danger";

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-2 overflow-hidden">
      <svg width={size} height={size} viewBox="0 0 160 160" aria-label={`Score ${shown} of 100`}>
        <circle cx="80" cy="80" r={r} className="fill-none stroke-muted" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className={cn("fill-none transition-[stroke-dashoffset] duration-500", stroke)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
        />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-foreground font-display"
          fontSize="32"
          fontWeight="500"
        >
          {shown}
        </text>
        <text x="80" y="98" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          / 100
        </text>
      </svg>
      <p className="font-medium">{verdict}</p>
    </div>
  );
}
