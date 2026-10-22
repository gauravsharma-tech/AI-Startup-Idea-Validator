import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";
import { LocationScout } from "@/components/map/location-scout";
import { useWizard } from "@/lib/wizard-store";

export const Route = createFileRoute("/app/map")({
  head: () => ({ meta: [{ title: "Location Scout · IdeaValidator" }] }),
  component: AppMapPage,
});

function AppMapPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
          <MapPin className="h-3.5 w-3.5" />
          Geospatial Intelligence
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Location Scout</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Drop a pin on any commercial spot to analyze footfall magnets, local competition density, and catch-area viability. Selected coordinates feed directly into your validation engine.
        </p>
      </div>

      <LocationScout
        onUseSpot={(snapshot) => {
          const { data, patch, setStep } = useWizard.getState();
          patch({ location: snapshot });
          // A brand-new idea starts at step 1; a half-filled one jumps to the Location step.
          setStep(data.startupName.trim() ? 5 : 1);
          toast.success("Spot saved. It will be used on the Location step of your validation.");
          void navigate({ to: "/app/validate" });
        }}
      />
    </div>
  );
}
