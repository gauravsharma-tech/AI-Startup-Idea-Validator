import {
  DRIVER_LABELS,
  SHOP_CATEGORIES,
  getCategory,
  weightsFor,
  type DriverKey,
  type ShopCategory,
} from "./categories.ts";

export interface NearbyPlace {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  distanceM: number;
}

export interface DriverPlace extends NearbyPlace {
  kind: DriverKey;
}

export interface AreaData {
  radiusM: number;
  /** Same-type shops (competitors) sorted by distance. */
  same: NearbyPlace[];
  drivers: DriverPlace[];
  /** Count of every shop (any type) inside the radius. */
  totalShops: number;
  /** Count of buildings explicitly tagged as housing inside the radius. */
  homes: number;
  /** Buildings tagged only `building=yes` (homes, shops, sheds - unknown). Optional for old data. */
  unlabeledBuildings?: number;
}

/** How much of an untagged building counts as a home when estimating demand. */
export const UNLABELED_BUILDING_HOME_SHARE = 0.3;
/** Below this many mapped objects the OSM data is too thin to trust. */
export const LOW_DATA_THRESHOLD = 12;

/** What the validator keeps from a map check: raw counts and nearby points, never scores. */
export interface SnapshotPlace {
  name: string | null;
  lat: number;
  lon: number;
  distanceM: number;
}
export interface SnapshotDriver extends SnapshotPlace {
  kind: DriverKey;
}
export interface LocationSnapshot {
  lat: number;
  lon: number;
  radiusM: number;
  categoryId: string;
  /** Place name from the search box, when the spot came from a search. */
  label: string | null;
  totalShops: number;
  homes: number;
  unlabeledBuildings: number;
  driverCounts: Record<DriverKey, number>;
  /** Nearest same-type shops (competitors), nearest first, at most MAX_SNAPSHOT_PLACES. */
  same: SnapshotPlace[];
  /** Nearest customer sources, for the report map only. */
  driverPoints: SnapshotDriver[];
  fetchedAt: string;
}
export const MAX_SNAPSHOT_PLACES = 25;

export type SpotLabel = "Strong spot" | "Good spot" | "Average spot" | "Risky spot" | "Weak spot";

export interface Assessment {
  opportunity: number;
  demandScore: number;
  competitionScore: number;
  label: SpotLabel;
  tone: "success" | "primary" | "warning" | "danger";
  sameCount: number;
  densityPerKm2: number;
  nearestSameM: number | null;
  demandRaw: number;
  driverCounts: Record<DriverKey, number>;
  profit: { low: number; mid: number; high: number };
  /** True when OSM has almost nothing mapped here, so the numbers are unreliable. */
  lowData: boolean;
  reasons: string[];
}

/** Demand points at which demand score is ~63. */
export const DEMAND_SCALE = 40;
/** Demand points per shop (incl. you) in a "normal" balanced market. */
export const REFERENCE_DEMAND_PER_SHOP = 14;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function areaKm2(radiusM: number): number {
  const r = radiusM / 1000;
  return Math.PI * r * r;
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function emptyDriverCounts(): Record<DriverKey, number> {
  return {
    school: 0,
    college: 0,
    hospital: 0,
    busStop: 0,
    station: 0,
    bank: 0,
    market: 0,
    worship: 0,
    office: 0,
  };
}

/** Everything `assess` needs, as plain numbers (so it can run on a stored snapshot). */
interface AssessInput {
  radiusM: number;
  sameCount: number;
  nearestSameM: number | null;
  totalShops: number;
  homes: number;
  unlabeledBuildings: number;
  driverCounts: Record<DriverKey, number>;
}

export function assess(
  data: AreaData,
  category: ShopCategory,
  baseMonthlyProfitInr: number = category.baseMonthlyProfitInr,
): Assessment {
  const driverCounts = emptyDriverCounts();
  for (const d of data.drivers) driverCounts[d.kind] += 1;
  return assessCounts(
    {
      radiusM: data.radiusM,
      sameCount: data.same.length,
      nearestSameM: data.same.length ? Math.round(data.same[0].distanceM) : null,
      totalShops: data.totalShops,
      homes: data.homes,
      unlabeledBuildings: data.unlabeledBuildings ?? 0,
      driverCounts,
    },
    category,
    baseMonthlyProfitInr,
  );
}

/** Re-scores a saved map check. Scores are always recomputed, never trusted from storage. */
export function assessSnapshot(snap: LocationSnapshot, baseMonthlyProfitInr?: number): Assessment {
  const category = getCategory(snap.categoryId);
  return assessCounts(
    {
      radiusM: snap.radiusM,
      sameCount: snap.same.length,
      nearestSameM: snap.same.length ? Math.round(snap.same[0].distanceM) : null,
      totalShops: snap.totalShops,
      homes: snap.homes,
      unlabeledBuildings: snap.unlabeledBuildings,
      driverCounts: snap.driverCounts,
    },
    category,
    baseMonthlyProfitInr ?? category.baseMonthlyProfitInr,
  );
}

function assessCounts(
  data: AssessInput,
  category: ShopCategory,
  baseMonthlyProfitInr: number,
): Assessment {
  const weights = weightsFor(category);
  const driverCounts = data.driverCounts;
  const driverTotal = (Object.keys(driverCounts) as DriverKey[]).reduce(
    (n, k) => n + driverCounts[k],
    0,
  );
  const homeEquivalent = data.homes + UNLABELED_BUILDING_HOME_SHARE * data.unlabeledBuildings;

  let demandRaw = weights.shops * data.totalShops + weights.homes * homeEquivalent;
  (Object.keys(driverCounts) as DriverKey[]).forEach((k) => {
    demandRaw += weights[k] * driverCounts[k];
  });

  const sameCount = data.sameCount;
  const densityPerKm2 = sameCount / areaKm2(data.radiusM);
  const demandScore = 100 * (1 - Math.exp(-demandRaw / DEMAND_SCALE));
  const competitionScore = 100 * Math.exp(-densityPerKm2 / category.saturationPerKm2);

  // Weighted geometric mean: a spot needs BOTH demand and breathing room.
  const opportunity = Math.round(
    Math.pow(Math.max(demandScore, 1), 0.55) * Math.pow(Math.max(competitionScore, 1), 0.45),
  );

  const label: SpotLabel =
    opportunity >= 70
      ? "Strong spot"
      : opportunity >= 55
        ? "Good spot"
        : opportunity >= 40
          ? "Average spot"
          : opportunity >= 25
            ? "Risky spot"
            : "Weak spot";
  const tone =
    opportunity >= 70
      ? "success"
      : opportunity >= 55
        ? "primary"
        : opportunity >= 40
          ? "warning"
          : "danger";

  const demandPerShop = demandRaw / (sameCount + 1);
  const factor = clamp(demandPerShop / REFERENCE_DEMAND_PER_SHOP, 0.25, 2);
  const mid = roundTo(baseMonthlyProfitInr * factor, 500);
  const profit = { low: roundTo(mid * 0.7, 500), mid, high: roundTo(mid * 1.3, 500) };

  const nearestSameM = data.nearestSameM;
  const lowData =
    data.totalShops +
      data.homes +
      UNLABELED_BUILDING_HOME_SHARE * data.unlabeledBuildings +
      driverTotal +
      sameCount <
    LOW_DATA_THRESHOLD;

  const reasons: string[] = [];
  const r = data.radiusM >= 1000 ? `${data.radiusM / 1000} km` : `${data.radiusM} m`;
  if (sameCount === 0) {
    reasons.push(
      `No ${category.label.toLowerCase()} is mapped within ${r}. That means no direct rival — but check that people here really buy this.`,
    );
  } else {
    reasons.push(
      `${sameCount} similar shop${sameCount === 1 ? "" : "s"} within ${r} (about ${densityPerKm2.toFixed(1)} per km²); the nearest is ${nearestSameM} m away.`,
    );
  }
  const topDrivers = (Object.keys(driverCounts) as DriverKey[])
    .map((k) => ({ k, pts: driverCounts[k] * weights[k], n: driverCounts[k] }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);
  if (topDrivers.length) {
    reasons.push(
      "Customer sources nearby: " +
        topDrivers
          .map(
            (d) => `${d.n} ${d.n === 1 ? DRIVER_LABELS[d.k].singular : DRIVER_LABELS[d.k].plural}`,
          )
          .join(", ") +
        ".",
    );
  }
  if (data.totalShops > 0) {
    reasons.push(
      `${data.totalShops} shops of all kinds nearby — ${data.totalShops >= 40 ? "a busy commercial area" : data.totalShops >= 12 ? "some commercial activity" : "a quiet area"}.`,
    );
  }
  if (competitionScore < 35)
    reasons.push(
      "Competition is heavy here. You would need a clear edge (price, quality, timings, location).",
    );
  if (demandScore < 30)
    reasons.push("Few customer sources are mapped around this point, so footfall may be low.");
  if (lowData)
    reasons.push(
      "OpenStreetMap has very little data for this spot. Treat the score as unreliable and verify on the ground.",
    );

  return {
    opportunity,
    demandScore: Math.round(demandScore),
    competitionScore: Math.round(competitionScore),
    label,
    tone,
    sameCount,
    densityPerKm2,
    nearestSameM,
    demandRaw,
    driverCounts: { ...driverCounts },
    profit,
    lowData,
    reasons,
  };
}

/** Keeps only what the validator needs from a fetched area. */
export function snapshotFromArea(
  data: AreaData,
  categoryId: string,
  point: { lat: number; lon: number },
  label: string | null = null,
  now: Date = new Date(),
): LocationSnapshot {
  const driverCounts = emptyDriverCounts();
  for (const d of data.drivers) driverCounts[d.kind] += 1;
  const place = (p: NearbyPlace): SnapshotPlace => ({
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    distanceM: Math.round(p.distanceM),
  });
  return {
    lat: point.lat,
    lon: point.lon,
    radiusM: data.radiusM,
    categoryId,
    label,
    totalShops: data.totalShops,
    homes: data.homes,
    unlabeledBuildings: data.unlabeledBuildings ?? 0,
    driverCounts,
    same: data.same.slice(0, MAX_SNAPSHOT_PLACES).map(place),
    driverPoints: data.drivers
      .slice(0, MAX_SNAPSHOT_PLACES)
      .map((d) => ({ ...place(d), kind: d.kind })),
    fetchedAt: now.toISOString(),
  };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const cleanName = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80) : null;

/**
 * Defensive reader for a snapshot that came from the browser or the database.
 * Returns null unless it is well-formed. Counts are clamped, and every distance
 * is recomputed from the coordinates, so a hand-edited request cannot claim a
 * rival is farther away than it is.
 */
export function sanitizeSnapshot(raw: unknown): LocationSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isNum(r.lat) || !isNum(r.lon) || Math.abs(r.lat) > 90 || Math.abs(r.lon) > 180) return null;
  if (!isNum(r.radiusM) || r.radiusM < 100 || r.radiusM > 3000) return null;
  if (typeof r.categoryId !== "string" || !SHOP_CATEGORIES.some((c) => c.id === r.categoryId)) return null;
  const count = (v: unknown, max: number) => (isNum(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);

  const driverCounts = emptyDriverCounts();
  const dc = (r.driverCounts && typeof r.driverCounts === "object" ? r.driverCounts : {}) as Record<string, unknown>;
  for (const k of Object.keys(driverCounts) as DriverKey[]) driverCounts[k] = count(dc[k], 5000);

  const points = (list: unknown): SnapshotPlace[] =>
    (Array.isArray(list) ? list : [])
      .filter(
        (p): p is Record<string, unknown> =>
          !!p && typeof p === "object" && isNum((p as Record<string, unknown>).lat) && isNum((p as Record<string, unknown>).lon),
      )
      .map((p) => ({
        name: cleanName(p.name),
        lat: p.lat as number,
        lon: p.lon as number,
        distanceM: Math.round(haversineM(r.lat as number, r.lon as number, p.lat as number, p.lon as number)),
      }))
      .filter((p) => p.distanceM <= (r.radiusM as number) * 1.15)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, MAX_SNAPSHOT_PLACES);

  const kinds = new Set(Object.keys(driverCounts));
  const driverPoints: SnapshotDriver[] = (Array.isArray(r.driverPoints) ? r.driverPoints : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && kinds.has(String((p as Record<string, unknown>).kind)))
    .flatMap((p) => points([p]).map((q) => ({ ...q, kind: p.kind as DriverKey })))
    .slice(0, MAX_SNAPSHOT_PLACES);

  return {
    lat: r.lat,
    lon: r.lon,
    radiusM: Math.round(r.radiusM),
    categoryId: r.categoryId,
    label: cleanName(r.label),
    totalShops: count(r.totalShops, 100000),
    homes: count(r.homes, 1000000),
    unlabeledBuildings: count(r.unlabeledBuildings, 1000000),
    driverCounts,
    same: points(r.same),
    driverPoints,
    fetchedAt: typeof r.fetchedAt === "string" ? r.fetchedAt.slice(0, 40) : new Date(0).toISOString(),
  };
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
