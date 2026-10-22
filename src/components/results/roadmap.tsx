import { useState, useEffect } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Sparkles,
  Target,
  Wrench,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import type { NextStep, StartupInput } from "@/lib/engine/types";

export function RoadmapSection({
  steps,
  startup,
}: {
  steps: NextStep[];
  startup: StartupInput;
}) {
  const storageKey = `roadmap_progress_${startup.startupName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  // Checked state for sub-action items: keyed by `${stepIndex}_${actionIndex}`
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  // Expanded card state
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({
    0: true,
    1: true,
  });
  // Filter tab
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheckedItems(JSON.parse(saved));
      }
    } catch {
      // storage unavailable
    }
  }, [storageKey]);

  // Persist to localStorage on update
  const toggleItem = (key: string) => {
    setCheckedItems((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const resetProgress = () => {
    setCheckedItems({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const toggleExpand = (stepNum: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  // Compute total tasks and completed count
  const allSubtaskKeys: string[] = [];
  steps.forEach((s, sIdx) => {
    if (s.actionSteps && s.actionSteps.length > 0) {
      s.actionSteps.forEach((_, aIdx) => {
        allSubtaskKeys.push(`${sIdx}_${aIdx}`);
      });
    } else {
      allSubtaskKeys.push(`${sIdx}_main`);
    }
  });

  const totalTasks = allSubtaskKeys.length;
  const completedCount = allSubtaskKeys.filter((k) => checkedItems[k]).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Filter options
  const filterOptions = ["All", "Month 1", "Month 2", "Month 3+"];

  const filteredSteps = steps.filter((s) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Month 1") return s.month?.includes("Month 1");
    if (activeFilter === "Month 2") return s.month?.includes("Month 2");
    if (activeFilter === "Month 3+") return s.month?.includes("Month 3") || s.month?.includes("Month 4");
    return true;
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <CalendarCheck2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Step-by-Step Execution Roadmap
                  <Badge variant="default" className="text-xs font-normal">
                    Interactive
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Day-by-day & month-by-month actionable founder plan. Complete tasks aur tick karein to track launch progress.
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats & Reset */}
          <div className="flex items-center gap-3 self-end md:self-center">
            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetProgress}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Progress
              </Button>
            )}
            <Badge
              variant={progressPct === 100 ? "success" : progressPct > 40 ? "default" : "secondary"}
              className="px-3 py-1 text-xs font-semibold"
            >
              {progressPct === 100
                ? "Ready to Launch 🚀"
                : progressPct > 50
                ? "MVP & Launch Phase"
                : "Discovery & Validation"}
            </Badge>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="mt-5 space-y-2 rounded-xl bg-muted/40 p-4 border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Progress: <strong className="text-primary">{completedCount}</strong> of{" "}
              {totalTasks} actionable milestones completed
            </span>
            <span className="font-semibold text-primary tabular-nums text-sm">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2.5 bg-muted" />
        </div>

        {/* Phase Filter Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-b border-border/50 pb-3">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setActiveFilter(opt)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                activeFilter === opt
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Step Cards List */}
        <div className="mt-6 space-y-4">
          {filteredSteps.map((step, sIdx) => {
            const isExpanded = Boolean(expandedSteps[step.step]);
            const stepSubtasks = step.actionSteps || [];
            const stepDoneCount = stepSubtasks.filter(
              (_, aIdx) => checkedItems[`${sIdx}_${aIdx}`],
            ).length;
            const isStepFullyDone =
              stepSubtasks.length > 0 && stepDoneCount === stepSubtasks.length;

            return (
              <div
                key={step.step}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isStepFullyDone
                    ? "border-success/40 bg-success/5 shadow-sm"
                    : "border-border/60 bg-card hover:border-border"
                }`}
              >
                {/* Step Card Header */}
                <div
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(step.step)}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        Step {step.step}
                      </span>
                      {step.timeframe && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" />
                          {step.timeframe}
                        </span>
                      )}
                      {step.category && (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {step.category}
                        </Badge>
                      )}
                      {isStepFullyDone && (
                        <Badge variant="success" className="text-[11px] font-medium">
                          Completed ✓
                        </Badge>
                      )}
                    </div>

                    <h3
                      className={`text-lg font-semibold tracking-tight ${
                        isStepFullyDone ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.detail}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    {stepSubtasks.length > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {stepDoneCount}/{stepSubtasks.length} done
                      </span>
                    )}
                    <button
                      type="button"
                      className="rounded-full p-1 hover:bg-muted text-muted-foreground"
                      aria-label={isExpanded ? "Collapse step" : "Expand step"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="border-t border-border/40 px-5 pt-4 pb-5 space-y-4 bg-muted/10">
                    {/* Actionable Sub-tasks with Ticks */}
                    {step.actionSteps && step.actionSteps.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Detailed Action Checklist (Tick off as you complete)
                        </h4>
                        <div className="space-y-2">
                          {step.actionSteps.map((action, aIdx) => {
                            const itemKey = `${sIdx}_${aIdx}`;
                            const isChecked = Boolean(checkedItems[itemKey]);

                            return (
                              <label
                                key={action}
                                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                                  isChecked
                                    ? "bg-success/10 border-success/30 text-foreground"
                                    : "bg-card border-border/40 hover:bg-muted/40 text-foreground"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleItem(itemKey)}
                                  className="mt-0.5"
                                />
                                <span
                                  className={`text-xs leading-relaxed ${
                                    isChecked
                                      ? "line-through text-muted-foreground font-normal"
                                      : "font-medium"
                                  }`}
                                >
                                  {action}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tools & Resources */}
                    {step.tools && step.tools.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Wrench className="h-3.5 w-3.5" />
                          Recommended Tools:
                        </span>
                        {step.tools.map((tool) => (
                          <Badge key={tool} variant="secondary" className="text-[11px] font-normal">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Success Metric / Exit Criteria */}
                    {step.successMetric && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs flex items-start gap-2.5">
                        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-foreground font-semibold">
                            Success Metric / Exit Criteria:
                          </strong>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">
                            {step.successMetric}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
