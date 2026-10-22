import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";
import { Info, Loader2, LocateFixed, MapPin, Search, Store, TrendingUp, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { SHOP_CATEGORIES, getCategory } from "@/lib/location/categories";
import { fetchArea, geocode } from "@/lib/location/overpass";
import { assess, snapshotFromArea, type AreaData, type LocationSnapshot } from "@/lib/location/score";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";
type LatLon = { lat: number; lon: number };

const RADII = [
  { value: 300, label: "300 m (walking distance)" },
  { value: 500, label: "500 m" },
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
];

const MIN_PICK_ZOOM = 12;
const inr = new Intl.NumberFormat("en-IN");
const rupees = (n: number) => `₹${inr.format(n)}`;
const radiusText = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`);

function tooltipEl(text: string): HTMLElement {
  // OSM names are user-editable, so never pass them to Leaflet as HTML.
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

const snapshotKey = (lat: number, lon: number, radiusM: number, categoryId: string) =>
  `${lat.toFixed(5)},${lon.toFixed(5)},${radiusM},${categoryId}`;

export function LocationScout({
  compact = false,
  initial = null,
  onSnapshot,
  onUseSpot,
}: {
  /** Single-column layout with a shorter map, for use inside the validation wizard. */
  compact?: boolean;
  /** A previously saved map check to start from (spot, radius and shop type). */
  initial?: LocationSnapshot | null;
  /** Called with the finished map check, or null while a changed spot is still loading. */
  onSnapshot?: (snapshot: LocationSnapshot | null) => void;
  /** Shows a "use this spot" button on the result panel. */
  onUseSpot?: (snapshot: LocationSnapshot) => void;
}) {
  const [categoryId, setCategoryId] = useState(
    initial && SHOP_CATEGORIES.some((c) => c.id === initial.categoryId)
      ? initial.categoryId
      : SHOP_CATEGORIES[0].id,
  );
  const [radiusM, setRadiusM] = useState(
    initial && RADII.some((r) => r.value === initial.radiusM) ? initial.radiusM : 500,
  );
  const [point, setPoint] = useState<LatLon | null>(
    initial ? { lat: initial.lat, lon: initial.lon } : null,
  );
  const [placeLabel, setPlaceLabel] = useState<string | null>(initial?.label ?? null);
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<AreaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [profitInput, setProfitInput] = useState(String(SHOP_CATEGORIES[0].baseMonthlyProfitInr));
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const category = getCategory(categoryId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const cacheRef = useRef(new Map<string, AreaData>());
  const pickRef = useRef<(lat: number, lon: number) => void>(() => undefined);
  const initialRef = useRef(initial);
  const onSnapshotRef = useRef(onSnapshot);
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  const pick = useCallback((lat: number, lon: number, fly = false, label: string | null = null) => {
    const map = mapRef.current;
    if (!fly && map && map.getZoom() < MIN_PICK_ZOOM) {
      toast.info("Zoom in closer to your area first, then click the exact spot.");
      return;
    }
    setPoint({ lat, lon });
    setPlaceLabel(label);
    if (fly && map) map.flyTo([lat, lon], Math.max(map.getZoom(), 15));
  }, []);

  useEffect(() => {
    pickRef.current = (lat, lon) => pick(lat, lon);
  }, [pick]);

  // Create the map once (browser only — Leaflet needs `window`).
  useEffect(() => {
    let cancelled = false;
    let map: LeafletNS.Map | null = null;
    (async () => {
      const L = (await import("leaflet")) as typeof LeafletNS;
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, { center: [22.5, 79], zoom: 5, worldCopyJump: true });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (e: LeafletNS.LeafletMouseEvent) =>
        pickRef.current(e.latlng.lat, e.latlng.lng),
      );
      leafletRef.current = L;
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      const start = initialRef.current;
      if (start) map.setView([start.lat, start.lon], 15);
      setMapReady(true);
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Load nearby shops whenever the spot, shop type or radius changes.
  useEffect(() => {
    if (!point) return;
    const key = `${point.lat.toFixed(5)},${point.lon.toFixed(5)},${radiusM},${category.id}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setData(cached);
      setStatus("done");
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    setStatus("loading");
    setError(null);
    setData(null);
    fetchArea(point.lat, point.lon, radiusM, category, ctrl.signal)
      .then((d) => {
        cacheRef.current.set(key, d);
        setData(d);
        setStatus("done");
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not load nearby shops.");
      });
    return () => ctrl.abort();
  }, [point, radiusM, category, retryTick]);

  // Draw the pin, radius circle and nearby places.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    if (!point) return;
    L.circle([point.lat, point.lon], {
      radius: radiusM,
      color: "#1d4ed8",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(layer);
    if (data) {
      for (const d of data.drivers) {
        L.circleMarker([d.lat, d.lon], {
          radius: 4,
          color: "#1d4ed8",
          weight: 1,
          fillColor: "#60a5fa",
          fillOpacity: 0.85,
        })
          .bindTooltip(tooltipEl(`${d.name ?? "Customer source"} · ${Math.round(d.distanceM)} m`))
          .addTo(layer);
      }
      for (const s of data.same) {
        L.circleMarker([s.lat, s.lon], {
          radius: 7,
          color: "#7f1d1d",
          weight: 2,
          fillColor: "#dc2626",
          fillOpacity: 0.9,
        })
          .bindTooltip(tooltipEl(`${s.name ?? "Unnamed shop"} · ${Math.round(s.distanceM)} m`))
          .addTo(layer);
      }
    }
    L.marker([point.lat, point.lon], {
      icon: L.divIcon({
        html: '<span style="font-size:30px;line-height:1;display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">📍</span>',
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      }),
      keyboard: false,
      interactive: false,
    }).addTo(layer);
  }, [mapReady, point, radiusM, data]);

  // Hand the finished map check to the wizard. While a changed spot reloads, send null so
  // the wizard never keeps a snapshot for a different spot than the pin on the map.
  useEffect(() => {
    const emit = onSnapshotRef.current;
    if (!emit || !point) return;
    if (status === "done" && data) {
      emit(snapshotFromArea(data, category.id, { lat: point.lat, lon: point.lon }, placeLabel));
      return;
    }
    const start = initialRef.current;
    const unchanged =
      start &&
      snapshotKey(start.lat, start.lon, start.radiusM, start.categoryId) ===
        snapshotKey(point.lat, point.lon, radiusM, category.id);
    if ((status === "loading" || status === "error") && !unchanged) emit(null);
  }, [status, data, point, radiusM, category.id, placeLabel]);

  const baseProfit = Number(profitInput) > 0 ? Number(profitInput) : category.baseMonthlyProfitInr;
  const result = useMemo(
    () => (data ? assess(data, category, baseProfit) : null),
    [data, category, baseProfit],
  );

  function onCategoryChange(id: string) {
    setCategoryId(id);
    setProfitInput(String(getCategory(id).baseMonthlyProfitInr));
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const hit = await geocode(q);
      if (!hit) {
        toast.error("We couldn't find that place. Try a village, area or landmark name.");
      } else {
        pick(hit.lat, hit.lon, true, hit.label.split(",").slice(0, 2).join(",").trim());
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Place search failed.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser can't share its location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => pick(pos.coords.latitude, pos.coords.longitude, true),
      () =>
        toast.error("Location permission was denied. Search a place or click on the map instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "grid gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-border)] md:grid-cols-2",
          !compact && "xl:grid-cols-[1.3fr_1fr_1.6fr_auto]",
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="scout-type">Shop you want to open</Label>
          <NativeSelect
            id="scout-type"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="scout-radius">Look around within</Label>
          <NativeSelect
            id="scout-radius"
            value={radiusM}
            onChange={(e) => setRadiusM(Number(e.target.value))}
          >
            {RADII.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <form onSubmit={onSearch} className="space-y-1.5">
          <Label htmlFor="scout-search">Find a place on the map</Label>
          <div className="flex gap-2">
            <Input
              id="scout-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Village, area or landmark"
            />
            <Button
              type="submit"
              variant="secondary"
              size="icon"
              disabled={searching}
              aria-label="Search place"
            >
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </div>
        </form>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={useMyLocation} className="w-full">
            <LocateFixed />
            Use my location
          </Button>
        </div>
      </div>

      <div className={cn("grid gap-5", !compact && "lg:grid-cols-[minmax(0,1fr)_400px]")}>
        <div className="space-y-2">
          <div className="relative isolate overflow-hidden rounded-xl shadow-[var(--shadow-border)]">
            <div
              ref={containerRef}
              className={cn("w-full bg-muted", compact ? "h-[360px]" : "h-[420px] md:h-[600px]")}
              role="application"
              aria-label="Map. Click the spot where you want to open your shop."
            />
            {!point && mapReady ? (
              <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center px-3">
                <p className="rounded-full bg-background/95 px-4 py-2 text-sm shadow-md">
                  👆 Zoom in, then click where you want to open your shop
                </p>
              </div>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span aria-hidden>📍</span> Your chosen spot
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full border-2 border-red-900 bg-red-600" />{" "}
              Similar shops (competitors)
            </li>
            <li className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full border border-blue-700 bg-blue-400" />{" "}
              Customer sources (schools, hospitals, stations…)
            </li>
          </ul>
        </div>

        <ResultPanel
          status={status}
          error={error}
          onRetry={() => setRetryTick((t) => t + 1)}
          hasPoint={!!point}
          categoryLabel={category.label}
          radiusM={radiusM}
          data={data}
          result={result}
          profitInput={profitInput}
          onProfitChange={setProfitInput}
          onUseSpot={
            onUseSpot && data && point
              ? () =>
                  onUseSpot(
                    snapshotFromArea(data, category.id, { lat: point.lat, lon: point.lon }, placeLabel),
                  )
              : undefined
          }
        />
      </div>
    </div>
  );
}

function ResultPanel({
  status,
  error,
  onRetry,
  hasPoint,
  categoryLabel,
  radiusM,
  data,
  result,
  profitInput,
  onProfitChange,
  onUseSpot,
}: {
  status: Status;
  error: string | null;
  onRetry: () => void;
  hasPoint: boolean;
  categoryLabel: string;
  radiusM: number;
  data: AreaData | null;
  result: ReturnType<typeof assess> | null;
  profitInput: string;
  onProfitChange: (v: string) => void;
  onUseSpot?: () => void;
}) {
  if (!hasPoint) {
    return (
      <aside className="space-y-3 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]">
        <MapPin className="size-6 text-primary" />
        <h2 className="font-display text-xl">Pick a spot</h2>
        <p className="text-sm text-muted-foreground">
          Choose your shop type, then click anywhere on the map. You'll see how many similar shops
          are already nearby, how many customers' places surround the spot, and a rough idea of the
          monthly profit.
        </p>
      </aside>
    );
  }

  if (status === "loading" || (status === "idle" && !result)) {
    return (
      <aside
        className="space-y-4 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]"
        aria-live="polite"
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking shops around this spot…
        </p>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full" />
      </aside>
    );
  }

  if (status === "error" || !result || !data) {
    return (
      <aside
        className="space-y-3 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]"
        role="alert"
      >
        <h2 className="font-display text-xl">Couldn't load map data</h2>
        <p className="text-sm text-muted-foreground">
          {error ?? "Something went wrong."} The free map data server is sometimes busy — please try
          again.
        </p>
        <Button onClick={onRetry}>Try again</Button>
      </aside>
    );
  }

  const toneBar = {
    success: "bg-success",
    primary: "bg-primary",
    warning: "bg-warning",
    danger: "bg-danger",
  }[result.tone];
  const toneText = {
    success: "text-success",
    primary: "text-primary",
    warning: "text-warning",
    danger: "text-danger",
  }[result.tone];

  return (
    <aside
      className="space-y-5 rounded-xl bg-card p-6 shadow-[var(--shadow-border)]"
      aria-live="polite"
    >
      <div>
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {categoryLabel} · within {radiusText(radiusM)}
        </p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className={cn("font-display text-2xl", toneText)}>{result.label}</p>
            <p className="text-sm text-muted-foreground">Opportunity score</p>
          </div>
          <p className="font-display text-5xl tabular-nums">
            {result.opportunity}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn("h-full rounded-full transition-[width] duration-500", toneBar)}
            style={{ width: `${result.opportunity}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Store className="size-3.5" /> Similar shops nearby
          </p>
          <p className="font-display text-3xl tabular-nums">{result.sameCount}</p>
          <p className="text-xs text-muted-foreground">
            {result.nearestSameM !== null
              ? `Nearest: ${result.nearestSameM} m away`
              : "No direct competitor mapped"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" /> Customer sources
          </p>
          <p className="font-display text-3xl tabular-nums">{data.drivers.length}</p>
          <p className="text-xs text-muted-foreground">
            {data.totalShops} shops of all types around
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Bar label="Demand" value={result.demandScore} hint="Higher = more customers around" />
        <Bar
          label="Room to grow"
          value={result.competitionScore}
          hint="Higher = less competition"
        />
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <TrendingUp className="size-4 text-success" /> Rough monthly profit
        </p>
        <p className="font-display text-2xl tabular-nums">
          {rupees(result.profit.low)} – {rupees(result.profit.high)}
        </p>
        <p className="text-xs text-muted-foreground">
          Likely around {rupees(result.profit.mid)}/month after expenses. This is an estimate, not a
          promise.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Label htmlFor="scout-profit" className="text-xs text-muted-foreground">
            A normal shop of this type earns ₹
          </Label>
          <Input
            id="scout-profit"
            inputMode="numeric"
            className="h-9 w-28 text-sm"
            value={profitInput}
            onChange={(e) => onProfitChange(e.target.value.replace(/[^\d]/g, ""))}
          />
          <span className="text-xs text-muted-foreground">/month</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Change this to a number you know from your own area — the estimate updates instantly.
        </p>
      </div>

      <ul className="space-y-2 text-sm">
        {result.reasons.map((r) => (
          <li key={r} className="flex gap-2">
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {data.same.length ? (
        <div>
          <p className="mb-2 text-sm font-medium">Closest similar shops</p>
          <ol className="divide-y divide-border rounded-lg border border-border text-sm">
            {data.same.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate">{s.name ?? "Unnamed shop"}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {Math.round(s.distanceM)} m
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {onUseSpot ? (
        <Button type="button" className="w-full" onClick={onUseSpot}>
          Use this spot to validate an idea
        </Button>
      ) : null}

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Shop and place data comes live from OpenStreetMap, which is volunteer-made and can miss
        small shops, especially in villages. Always walk the area and talk to people before you
        invest.
      </p>
    </aside>
  );
}

function Bar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}/100</span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label} ${value} out of 100. ${hint}`}
      >
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
