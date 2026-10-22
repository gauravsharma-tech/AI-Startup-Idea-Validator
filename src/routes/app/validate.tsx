import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  BUSINESS_MODELS,
  FREQUENCIES,
  GEOGRAPHIES,
  INDUSTRIES,
  STAGES,
} from "@/lib/engine/types";
import { LocationScout } from "@/components/map/location-scout";
import { DEMO_IDEAS } from "@/lib/engine/demo";
import { getCategory } from "@/lib/location/categories";
import { assessSnapshot } from "@/lib/location/score";
import { createAndAnalyze, reanalyzeIdea } from "@/lib/server/startups";
import { emptyWizard, validateStep } from "@/lib/validation";
import { useWizard } from "@/lib/wizard-store";

export const Route = createFileRoute("/app/validate")({ component: ValidatePage });

const STEPS = ["Idea", "Problem", "Market", "Business", "Location", "Review"] as const;

function ValidatePage() {
  const { step, data, basedOn, setStep, patch, reset } = useWizard();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  function go(next: number) {
    const parsed = validateStep(step, data);
    if (next > step && !parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error("Please complete the required fields.");
      return;
    }
    setErrors({});
    setStep(next);
  }

  async function analyze() {
    const parsed = validateStep(6, data);
    if (!parsed.success) {
      toast.error("Please complete the required fields.");
      return;
    }
    setBusy(true);
    try {
      const res = basedOn
        ? await reanalyzeIdea({ data: { basedOnId: basedOn, idea: parsed.data } })
        : await createAndAnalyze({ data: parsed.data });
      reset();
      await navigate({
        to: "/app/processing/$analysisId",
        params: { analysisId: res.analysisId },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't connect to the analysis service. Please try again.";
      toast.error(message.includes("Unauthorized") ? "Please sign in to analyze an idea." : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {basedOn ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
          <p>
            You are editing a saved idea. Analyzing again saves a <strong>new version</strong> and keeps
            the old one.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => reset()} disabled={busy}>
            Start a blank idea instead
          </Button>
        </div>
      ) : null}
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Step {step} of 6
      </p>
      <ol className="mt-3 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs ${i + 1 === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => (i + 1 < step ? setStep(i + 1) : go(i + 1))}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        {step === 1 ? <IdeaStep data={data} patch={patch} errors={errors} /> : null}
        {step === 2 ? <ProblemStep data={data} patch={patch} errors={errors} /> : null}
        {step === 3 ? <MarketStep data={data} patch={patch} errors={errors} /> : null}
        {step === 4 ? <BusinessStep data={data} patch={patch} errors={errors} /> : null}
        {step === 5 ? <LocationStep data={data} patch={patch} /> : null}
        {step === 6 ? <ReviewStep data={data} onEdit={setStep} /> : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" type="button" onClick={() => (step === 1 ? reset() : setStep(step - 1))} disabled={busy}>
          {step === 1 ? "Reset" : "Previous"}
        </Button>
        {step < 6 ? (
          <Button type="button" onClick={() => go(step + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" onClick={analyze} disabled={busy}>
            {busy ? "Saving idea…" : "Analyze my startup"}
          </Button>
        )}
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

function SampleIdeaPicker({
  data,
  patch,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
}) {
  const isSampleLoaded = DEMO_IDEAS.some((d) => d.startupName === data.startupName);

  function loadIdea(ideaWithSlug: (typeof DEMO_IDEAS)[number]) {
    const { slug: _slug, ...idea } = ideaWithSlug;
    patch(idea);
    toast.success(`Loaded "${ideaWithSlug.startupName}" (${ideaWithSlug.industry}) across all steps.`);
  }

  function loadRandom() {
    const remaining = DEMO_IDEAS.filter((d) => d.startupName !== data.startupName);
    const pool = remaining.length > 0 ? remaining : DEMO_IDEAS;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    loadIdea(picked);
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-card/60 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sample ideas ({DEMO_IDEAS.length} unique presets)
            </p>
            <p className="text-xs text-muted-foreground">
              Explore diverse business models, industries, and validation profiles:
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
            onClick={loadRandom}
          >
            <Shuffle className="h-3.5 w-3.5 text-primary" />
            Surprise me
          </Button>

          <NativeSelect
            id="sample-select"
            className="h-8 text-xs min-w-[190px]"
            value={DEMO_IDEAS.some((d) => d.startupName === data.startupName) ? data.startupName : ""}
            onChange={(e) => {
              const found = DEMO_IDEAS.find((d) => d.startupName === e.target.value);
              if (found) loadIdea(found);
            }}
          >
            <option value="" disabled>
              Select an idea…
            </option>
            {DEMO_IDEAS.map((d) => (
              <option key={d.slug} value={d.startupName}>
                {d.startupName} · {d.industry}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
        {DEMO_IDEAS.map((d) => {
          const isSelected = data.startupName === d.startupName;
          return (
            <button
              key={d.slug}
              type="button"
              onClick={() => loadIdea(d)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 font-semibold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              )}
            >
              <span>{d.startupName}</span>
              <span
                className={cn(
                  "text-[10px] font-normal",
                  isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
                )}
              >
                · {d.industry}
              </span>
            </button>
          );
        })}
      </div>

      {isSampleLoaded && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-1.5 text-xs text-primary border border-primary/20">
          <p>
            <span className="font-semibold">{data.startupName}</span> is prefilled across all 6 steps. You can tweak any field or click Next!
          </p>
          <button
            type="button"
            onClick={() => {
              patch({
                startupName: "",
                description: "",
                problemStatement: "",
                targetCustomer: "",
                targetMarket: "",
                revenueModel: "",
                competitors: [],
                differentiator: "",
              });
              toast.message("Cleared form fields.");
            }}
            className="ml-2 font-medium underline hover:text-foreground whitespace-nowrap"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function IdeaStep({
  data,
  patch,
  errors,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Tell us about your startup idea</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A concrete description beats a slogan. We use this text for NLP keyword extraction.
        </p>
        <SampleIdeaPicker data={data} patch={patch} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Startup name</Label>
        <Input
          id="name"
          placeholder="Example: StudyAI"
          value={data.startupName}
          onChange={(e) => patch({ startupName: e.target.value })}
        />
        <FieldError message={errors.startupName} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="desc">Startup description</Label>
        <Textarea
          id="desc"
          placeholder="Describe what your startup does, who it helps, and how it works."
          value={data.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{data.description.trim().length} characters · aim for 80+</p>
        <FieldError message={errors.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <NativeSelect
            id="industry"
            value={data.industry}
            onChange={(e) => patch({ industry: e.target.value })}
          >
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stage">Startup stage</Label>
          <NativeSelect id="stage" value={data.stage} onChange={(e) => patch({ stage: e.target.value })}>
            {STAGES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}

function ProblemStep({
  data,
  patch,
  errors,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">What problem are you solving?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Problem-solution fit depends on who hurts, how often, and how badly.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="problem">Problem statement</Label>
        <Textarea
          id="problem"
          value={data.problemStatement}
          onChange={(e) => patch({ problemStatement: e.target.value })}
        />
        <FieldError message={errors.problemStatement} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="customer">Target customers</Label>
        <Input
          id="customer"
          placeholder="College students, small businesses, working professionals…"
          value={data.targetCustomer}
          onChange={(e) => patch({ targetCustomer: e.target.value })}
        />
        <FieldError message={errors.targetCustomer} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="freq">Problem frequency</Label>
        <NativeSelect
          id="freq"
          value={data.problemFrequency}
          onChange={(e) => patch({ problemFrequency: e.target.value })}
        >
          {FREQUENCIES.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label>Problem severity · {data.problemSeverity}/100</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[data.problemSeverity]}
          onValueChange={([v]) => patch({ problemSeverity: v ?? 0 })}
        />
        <p className="text-xs text-muted-foreground">
          0 is a mild inconvenience. 100 is a costly, urgent pain people already try to solve.
        </p>
      </div>
    </div>
  );
}

function MarketStep({
  data,
  patch,
  errors,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Tell us about your market</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your demand slider is an initial estimate. The engine scores demand independently of that number.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="market">Target market</Label>
        <Input
          id="market"
          value={data.targetMarket}
          onChange={(e) => patch({ targetMarket: e.target.value })}
        />
        <FieldError message={errors.targetMarket} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="geo">Geographic market</Label>
        <NativeSelect
          id="geo"
          value={data.geographicMarket}
          onChange={(e) => patch({ geographicMarket: e.target.value })}
        >
          {GEOGRAPHIES.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="base">Estimated customer base (optional)</Label>
          <Input
            id="base"
            type="number"
            min={0}
            value={data.estimatedCustomers ?? ""}
            onChange={(e) =>
              patch({ estimatedCustomers: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Expected pricing (₹, optional)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={data.expectedPricing ?? ""}
            onChange={(e) =>
              patch({ expectedPricing: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Market demand perception · {data.demandPerception}/100</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[data.demandPerception]}
          onValueChange={([v]) => patch({ demandPerception: v ?? 0 })}
        />
        <p className="text-xs text-muted-foreground">
          This is your gut estimate. It is one input among several, not the final market score.
        </p>
      </div>
    </div>
  );
}

function BusinessStep({
  data,
  patch,
  errors,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
  errors: Record<string, string>;
}) {
  const competitorText = data.competitors.join(", ");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">How will your startup make money?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Naming competitors is a plus. A crowded market with a sharp wedge can still score well.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="model">Business model</Label>
        <NativeSelect
          id="model"
          value={data.businessModel}
          onChange={(e) => patch({ businessModel: e.target.value })}
        >
          {BUSINESS_MODELS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rev">Expected revenue model</Label>
        <Input
          id="rev"
          value={data.revenueModel}
          onChange={(e) => patch({ revenueModel: e.target.value })}
        />
        <FieldError message={errors.revenueModel} />
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI Market Competitor & Risk Analysis</span>
          </div>
          <Badge variant="default" className="text-[11px] font-normal">
            Automated by AI
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          No need to manually search or enter competitors. AI will auto-detect the top market competitors based on your industry ({data.industry || "selected domain"}), target customer, and problem statement — identify their risks, and build mitigation strategies to compete or navigate around them.
        </p>
        <details className="pt-1 text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground font-medium select-none text-[11px] text-primary">
            + Want to add a specific rival's name? (Optional)
          </summary>
          <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
            <Input
              id="comp"
              placeholder="e.g. Acme Corp, Local Rival (Leave blank for 100% AI auto-detection)"
              value={competitorText}
              onChange={(e) =>
                patch({
                  competitors: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </details>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="diff">Key differentiator</Label>
        <Textarea
          id="diff"
          value={data.differentiator}
          onChange={(e) => patch({ differentiator: e.target.value })}
        />
        <FieldError message={errors.differentiator} />
      </div>
      <div className="space-y-2">
        <Label>Scalability · {data.scalability}/100</Label>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[data.scalability]}
          onValueChange={([v]) => patch({ scalability: v ?? 0 })}
        />
      </div>
    </div>
  );
}

function LocationStep({
  data,
  patch,
}: {
  data: ReturnType<typeof emptyWizard>;
  patch: (p: Partial<ReturnType<typeof emptyWizard>>) => void;
}) {
  const [usesMap, setUsesMap] = useState(data.location != null);
  const snapshot = data.location;
  const result = snapshot ? assessSnapshot(snapshot) : null;
  const nearbyNames = snapshot
    ? [...new Set(snapshot.same.map((s) => s.name).filter((n): n is string => !!n))].slice(0, 5)
    : [];

  function addNearbyCompetitors() {
    const have = new Set(data.competitors.map((c) => c.toLowerCase()));
    const fresh = nearbyNames.filter((n) => !have.has(n.toLowerCase()));
    if (fresh.length === 0) {
      toast.message("Those shops are already in your competitor list.");
      return;
    }
    patch({ competitors: [...data.competitors, ...fresh].slice(0, 12) });
    toast.success(`Added ${fresh.length} nearby shop${fresh.length === 1 ? "" : "s"} to your competitors.`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Does your idea depend on a physical spot?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For a shop, café, clinic or kiosk, a map check of the area (similar shops, schools, stations,
          offices nearby) adds real evidence to market demand and competition. Online ideas can skip
          this.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={usesMap ? "default" : "outline"}
          onClick={() => setUsesMap(true)}
        >
          Yes, pick a spot on the map
        </Button>
        <Button
          type="button"
          variant={usesMap ? "outline" : "default"}
          onClick={() => {
            setUsesMap(false);
            patch({ location: null });
          }}
        >
          No, skip this step
        </Button>
      </div>

      {usesMap ? (
        <>
          <LocationScout compact initial={data.location} onSnapshot={(s) => patch({ location: s })} />
          {snapshot && result ? (
            <section className="space-y-3 rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
              <h2 className="font-medium">
                Map check saved: {result.label} ({result.opportunity}/100)
              </h2>
              <p className="text-sm text-muted-foreground">
                {getCategory(snapshot.categoryId).label} within {snapshot.radiusM} m
                {snapshot.label ? ` of ${snapshot.label}` : ""}: {result.sameCount} similar shop
                {result.sameCount === 1 ? "" : "s"}, demand {result.demandScore}/100, room to grow{" "}
                {result.competitionScore}/100. This is blended into the demand and competition scores.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addNearbyCompetitors}
                disabled={nearbyNames.length === 0}
              >
                {nearbyNames.length === 0
                  ? "No named shops nearby to add"
                  : `Add ${nearbyNames.length} nearby shop${nearbyNames.length === 1 ? "" : "s"} to my competitors`}
              </Button>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click the map to pick the spot. The result appears here once the area has loaded. You can
              still continue without it.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function ReviewStep({
  data,
  onEdit,
}: {
  data: ReturnType<typeof emptyWizard>;
  onEdit: (step: number) => void;
}) {
  const blocks = [
    { step: 1, title: "Startup", body: `${data.startupName} · ${data.industry} · ${data.stage}\n${data.description}` },
    { step: 2, title: "Problem", body: `${data.problemStatement}\nCustomer: ${data.targetCustomer}` },
    { step: 3, title: "Market", body: `${data.targetMarket} · ${data.geographicMarket}` },
    { step: 4, title: "Business model", body: `${data.businessModel} · ${data.revenueModel}` },
    { step: 4, title: "Competition", body: data.competitors.length ? data.competitors.join(", ") : "AI auto-detected from industry & market risks" },
    { step: 4, title: "Differentiator", body: data.differentiator },
    {
      step: 5,
      title: "Location",
      body: data.location
        ? `${getCategory(data.location.categoryId).label} within ${data.location.radiusM} m${data.location.label ? ` of ${data.location.label}` : ""}: ${assessSnapshot(data.location).label} (${assessSnapshot(data.location).opportunity}/100), ${data.location.same.length} similar shop${data.location.same.length === 1 ? "" : "s"} nearby`
        : "No map check (online or non-location idea)",
    },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl">Review before analysis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm the inputs. Analysis uses rule-based scoring, NLP, and a Random Forest consistency check trained on simulated data.
        </p>
      </div>
      {blocks.map((b) => (
        <section key={b.title} className="rounded-xl bg-card p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium">{b.title}</h2>
            <Button variant="ghost" size="sm" type="button" onClick={() => onEdit(b.step)}>
              Edit
            </Button>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{b.body}</p>
        </section>
      ))}
    </div>
  );
}
