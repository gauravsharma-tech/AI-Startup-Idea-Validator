import {
  DRIVER_MATCH,
  HOME_BUILDING_VALUES,
  tagMatches,
  type DriverKey,
  type ShopCategory,
  type TagMatch,
} from "./categories.ts";
import { haversineM, type AreaData, type DriverPlace, type NearbyPlace } from "./score.ts";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

interface OverpassElement {
  type: "node" | "way" | "relation" | "count";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function selector(rule: TagMatch, around: string): string {
  const filter = rule.values ? `["${rule.key}"~"^(${rule.values.join("|")})$"]` : `["${rule.key}"]`;
  return `nwr${filter}${around};`;
}

export function buildQuery(
  lat: number,
  lon: number,
  radiusM: number,
  category: ShopCategory,
): string {
  const around = `(around:${radiusM},${lat.toFixed(6)},${lon.toFixed(6)})`;
  const same = category.match.map((m) => selector(m, around)).join("");
  const drivers = (Object.values(DRIVER_MATCH).flat() as TagMatch[])
    .map((m) => selector(m, around))
    .join("");
  const homes = `nwr["building"~"^(${HOME_BUILDING_VALUES.join("|")})$"]${around};`;
  const unlabeled = `nwr["building"="yes"]${around};`;
  return [
    "[out:json][timeout:25];",
    `(${same})->.same;`,
    ".same out center tags;",
    `(${drivers})->.drv;`,
    ".drv out center tags;",
    `nwr["shop"]${around};`,
    "out count;",
    homes,
    "out count;",
    unlabeled,
    "out count;",
  ].join("\n");
}

function pointOf(el: OverpassElement): { lat: number; lon: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  return null;
}

function countOf(el: OverpassElement | undefined): number {
  const raw = (el?.tags as Record<string, string> | undefined)?.total;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function parseResponse(
  elements: OverpassElement[],
  lat: number,
  lon: number,
  radiusM: number,
  category: ShopCategory,
): AreaData {
  const same: NearbyPlace[] = [];
  const drivers: DriverPlace[] = [];
  const seen = new Set<string>();
  const counts: OverpassElement[] = [];

  for (const el of elements) {
    if (el.type === "count") {
      counts.push(el);
      continue;
    }
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = pointOf(el);
    if (!p) continue;
    const base = {
      id: key,
      name: el.tags?.name ?? el.tags?.["name:en"] ?? el.tags?.brand ?? null,
      lat: p.lat,
      lon: p.lon,
      distanceM: haversineM(lat, lon, p.lat, p.lon),
    };
    if (tagMatches(el.tags, category.match)) {
      same.push(base);
      continue;
    }
    for (const kind of Object.keys(DRIVER_MATCH) as DriverKey[]) {
      if (tagMatches(el.tags, DRIVER_MATCH[kind])) {
        drivers.push({ ...base, kind });
        break;
      }
    }
  }
  same.sort((a, b) => a.distanceM - b.distanceM);
  drivers.sort((a, b) => a.distanceM - b.distanceM);

  // Counts arrive in the order they were requested: all shops, tagged homes,
  // then buildings tagged only "yes".
  return {
    radiusM,
    same,
    drivers,
    totalShops: countOf(counts[0]),
    homes: countOf(counts[1]),
    unlabeledBuildings: countOf(counts[2]),
  };
}

export async function fetchArea(
  lat: number,
  lon: number,
  radiusM: number,
  category: ShopCategory,
  signal?: AbortSignal,
): Promise<AreaData> {
  const body = new URLSearchParams({ data: buildQuery(lat, lon, radiusM, category) });
  let lastError: unknown = null;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: "POST", body, signal });
      if (!res.ok) throw new Error(`Map data server answered ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string };
      if (!json.elements) throw new Error(json.remark || "Map data server returned nothing");
      return parseResponse(json.elements, lat, lon, radiusM, category);
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not load nearby shops.");
}

export interface GeocodeHit {
  lat: number;
  lon: number;
  label: string;
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Place search is unavailable right now.");
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name };
}
