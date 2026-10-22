import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/layout/site-header";
import { LocationScout } from "@/components/map/location-scout";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Shop location map · IdeaValidator" }] }),
  component: MapPage,
});

function MapPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div>
          <h1 className="font-display text-3xl">Where should I open my shop?</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Click any spot on the live map to see how many similar shops are already around, how
            busy the area looks, and a rough monthly profit estimate.
          </p>
        </div>
        <LocationScout />
      </main>
      <SiteFooter />
    </div>
  );
}
