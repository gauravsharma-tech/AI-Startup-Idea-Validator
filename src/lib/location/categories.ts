/**
 * Shop categories for the Location Scout.
 *
 * Everything here is a documented, tunable assumption — not measured data.
 * Tag matching uses plain OpenStreetMap tags so the same definition drives both the
 * Overpass query and the client-side classification of what comes back.
 */

export type TagMatch = { key: string; values?: readonly string[] };

export type DriverKey =
  | "school"
  | "college"
  | "hospital"
  | "busStop"
  | "station"
  | "bank"
  | "market"
  | "worship"
  | "office";

export type DemandWeights = Record<DriverKey, number> & {
  /** Weight per other shop of any type (commercial activity = footfall proxy). */
  shops: number;
  /** Weight per mapped home / residential building. */
  homes: number;
};

export interface ShopCategory {
  id: string;
  label: string;
  emoji: string;
  /** OSM tags that identify a competitor of this type. */
  match: readonly TagMatch[];
  /** Same-type shops per km² at which competition is considered heavy (score ≈ 37). */
  saturationPerKm2: number;
  /** Assumed typical net profit (INR / month) of one ordinary shop of this type. Editable in the UI. */
  baseMonthlyProfitInr: number;
  weights: Partial<DemandWeights>;
}

export const DEFAULT_WEIGHTS: DemandWeights = {
  school: 1.5,
  college: 2,
  hospital: 1.5,
  busStop: 0.5,
  station: 4,
  bank: 1,
  market: 3,
  worship: 0.7,
  office: 0.8,
  shops: 0.2,
  homes: 0.05,
};

export const DRIVER_LABELS: Record<DriverKey, { singular: string; plural: string }> = {
  school: { singular: "school", plural: "schools" },
  college: { singular: "college", plural: "colleges" },
  hospital: { singular: "hospital / clinic", plural: "hospitals / clinics" },
  busStop: { singular: "bus stop", plural: "bus stops" },
  station: { singular: "station", plural: "stations" },
  bank: { singular: "bank / ATM", plural: "banks / ATMs" },
  market: { singular: "market", plural: "markets" },
  worship: { singular: "place of worship", plural: "places of worship" },
  office: { singular: "office", plural: "offices" },
};

/** What counts as a footfall source. Counts come from OSM, so incomplete maps under-count. */
export const DRIVER_MATCH: Record<DriverKey, readonly TagMatch[]> = {
  school: [{ key: "amenity", values: ["school", "kindergarten"] }],
  college: [{ key: "amenity", values: ["college", "university"] }],
  hospital: [{ key: "amenity", values: ["hospital", "clinic", "doctors", "dentist"] }],
  busStop: [{ key: "highway", values: ["bus_stop"] }],
  station: [
    { key: "amenity", values: ["bus_station"] },
    { key: "railway", values: ["station", "halt"] },
  ],
  bank: [{ key: "amenity", values: ["bank", "atm"] }],
  market: [{ key: "amenity", values: ["marketplace"] }],
  worship: [{ key: "amenity", values: ["place_of_worship"] }],
  office: [{ key: "office" }],
};

/**
 * Buildings explicitly tagged as housing. A bare `building=yes` is NOT in this
 * list: in India most OSM buildings (homes, shops, sheds) carry only that tag, so
 * counting them as homes inflated demand. They are counted separately and
 * weighted by UNLABELED_BUILDING_HOME_SHARE in score.ts.
 */
export const HOME_BUILDING_VALUES = [
  "residential",
  "apartments",
  "house",
  "detached",
  "terrace",
  "dormitory",
] as const;

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  {
    id: "kirana",
    label: "Kirana / grocery / general store",
    emoji: "🛒",
    match: [
      {
        key: "shop",
        values: ["convenience", "general", "supermarket", "grocery", "variety_store"],
      },
    ],
    saturationPerKm2: 30,
    baseMonthlyProfitInr: 25000,
    weights: { homes: 0.1, shops: 0.15, school: 1, college: 1 },
  },
  {
    id: "pharmacy",
    label: "Medical store / pharmacy",
    emoji: "💊",
    match: [
      { key: "amenity", values: ["pharmacy"] },
      { key: "shop", values: ["chemist"] },
    ],
    saturationPerKm2: 10,
    baseMonthlyProfitInr: 35000,
    weights: { hospital: 5, homes: 0.08, school: 0.5, shops: 0.1 },
  },
  {
    id: "restaurant",
    label: "Restaurant / fast food",
    emoji: "🍽️",
    match: [{ key: "amenity", values: ["restaurant", "fast_food", "food_court"] }],
    saturationPerKm2: 25,
    baseMonthlyProfitInr: 40000,
    weights: { office: 1.5, station: 5, busStop: 0.8, market: 2, college: 2.5, shops: 0.25 },
  },
  {
    id: "cafe",
    label: "Cafe / tea & coffee stall",
    emoji: "☕",
    match: [{ key: "amenity", values: ["cafe"] }],
    saturationPerKm2: 10,
    baseMonthlyProfitInr: 30000,
    weights: { college: 3.5, office: 2, station: 4, busStop: 0.8, shops: 0.25 },
  },
  {
    id: "bakery",
    label: "Bakery / sweets",
    emoji: "🥐",
    match: [{ key: "shop", values: ["bakery", "pastry", "confectionery"] }],
    saturationPerKm2: 8,
    baseMonthlyProfitInr: 28000,
    weights: { homes: 0.08, school: 2, worship: 1, market: 3 },
  },
  {
    id: "clothing",
    label: "Clothing / boutique / tailor",
    emoji: "👕",
    match: [
      { key: "shop", values: ["clothes", "boutique", "fashion", "tailor", "shoes", "fabric"] },
    ],
    saturationPerKm2: 20,
    baseMonthlyProfitInr: 35000,
    weights: { market: 4, shops: 0.35, college: 2, homes: 0.04 },
  },
  {
    id: "mobile",
    label: "Mobile / electronics shop",
    emoji: "📱",
    match: [{ key: "shop", values: ["mobile_phone", "electronics", "computer", "hifi"] }],
    saturationPerKm2: 10,
    baseMonthlyProfitInr: 30000,
    weights: { college: 3, market: 3, shops: 0.3, station: 4 },
  },
  {
    id: "salon",
    label: "Salon / beauty parlour",
    emoji: "💇",
    match: [{ key: "shop", values: ["hairdresser", "beauty", "cosmetics"] }],
    saturationPerKm2: 15,
    baseMonthlyProfitInr: 25000,
    weights: { homes: 0.1, office: 1.2, college: 2, shops: 0.2 },
  },
  {
    id: "hardware",
    label: "Hardware / paint / building material",
    emoji: "🔧",
    match: [{ key: "shop", values: ["hardware", "doityourself", "paint", "trade", "electrical"] }],
    saturationPerKm2: 8,
    baseMonthlyProfitInr: 35000,
    weights: { homes: 0.1, shops: 0.15, market: 2 },
  },
  {
    id: "stationery",
    label: "Stationery / books / xerox",
    emoji: "📚",
    match: [{ key: "shop", values: ["stationery", "books", "copyshop"] }],
    saturationPerKm2: 8,
    baseMonthlyProfitInr: 18000,
    weights: { school: 4, college: 4, office: 1.5, shops: 0.1 },
  },
  {
    id: "greengrocer",
    label: "Fruits & vegetables",
    emoji: "🥬",
    match: [{ key: "shop", values: ["greengrocer", "farm"] }],
    saturationPerKm2: 15,
    baseMonthlyProfitInr: 20000,
    weights: { market: 5, homes: 0.12, worship: 1.2, shops: 0.1 },
  },
  {
    id: "gym",
    label: "Gym / fitness centre",
    emoji: "🏋️",
    match: [{ key: "leisure", values: ["fitness_centre", "sports_centre"] }],
    saturationPerKm2: 5,
    baseMonthlyProfitInr: 40000,
    weights: { office: 1.2, college: 2.5, homes: 0.1, shops: 0.1 },
  },
];

export function getCategory(id: string): ShopCategory {
  return SHOP_CATEGORIES.find((c) => c.id === id) ?? SHOP_CATEGORIES[0];
}

export function weightsFor(category: ShopCategory): DemandWeights {
  return { ...DEFAULT_WEIGHTS, ...category.weights };
}

export function tagMatches(
  tags: Record<string, string> | undefined,
  rules: readonly TagMatch[],
): boolean {
  if (!tags) return false;
  return rules.some((r) => {
    const v = tags[r.key];
    if (v === undefined) return false;
    return r.values ? r.values.includes(v) : true;
  });
}
