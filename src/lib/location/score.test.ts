import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCategory, tagMatches } from "./categories.ts";
import { buildQuery, parseResponse } from "./overpass.ts";
import {
  assess,
  areaKm2,
  assessSnapshot,
  sanitizeSnapshot,
  snapshotFromArea,
  type AreaData,
  type NearbyPlace,
} from "./score.ts";

const kirana = getCategory("kirana");
const pharmacy = getCategory("pharmacy");

function shops(n: number): NearbyPlace[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `node/${i}`,
    name: null,
    lat: 0,
    lon: 0,
    distanceM: 50 + i * 20,
  }));
}

function area(partial: Partial<AreaData>): AreaData {
  return { radiusM: 500, same: [], drivers: [], totalShops: 0, homes: 0, ...partial };
}

describe("location assessment", () => {
  it("scores a crowded spot lower than an empty one with the same demand", () => {
    const base = { totalShops: 60, homes: 200 };
    const crowded = assess(area({ ...base, same: shops(25) }), kirana);
    const open = assess(area({ ...base, same: shops(2) }), kirana);
    assert.ok(open.opportunity > crowded.opportunity);
    assert.ok(open.profit.mid > crowded.profit.mid);
  });

  it("does not reward zero competition when there is no demand", () => {
    const dead = assess(area({}), kirana);
    assert.ok(dead.opportunity < 25);
    assert.equal(dead.lowData, true);
  });

  it("weights hospitals heavily for pharmacies", () => {
    const hospitals = Array.from({ length: 3 }, (_, i) => ({
      id: `h${i}`,
      name: null,
      lat: 0,
      lon: 0,
      distanceM: 100,
      kind: "hospital" as const,
    }));
    const forPharmacy = assess(area({ drivers: hospitals }), pharmacy);
    const forKirana = assess(area({ drivers: hospitals }), kirana);
    assert.ok(forPharmacy.demandScore > forKirana.demandScore);
  });

  it("keeps the profit range ordered and honours the user's base profit", () => {
    const a = assess(area({ totalShops: 40, homes: 100 }), kirana, 40000);
    const b = assess(area({ totalShops: 40, homes: 100 }), kirana, 20000);
    assert.ok(a.profit.low <= a.profit.mid && a.profit.mid <= a.profit.high);
    assert.ok(a.profit.mid > b.profit.mid);
  });

  it("computes circle area", () => {
    assert.equal(Number(areaKm2(1000).toFixed(3)), 3.142);
  });
});

describe("overpass helpers", () => {
  it("matches tags exactly", () => {
    assert.equal(tagMatches({ shop: "convenience" }, kirana.match), true);
    assert.equal(tagMatches({ shop: "convenience_store" }, kirana.match), false);
    assert.equal(tagMatches(undefined, kirana.match), false);
  });

  it("builds a query with the radius and counts for shops, tagged homes and untagged buildings", () => {
    const q = buildQuery(19.7, 72.77, 500, kirana);
    assert.match(q, /around:500,19\.700000,72\.770000/);
    assert.equal((q.match(/out count;/g) ?? []).length, 3);
    assert.match(q, /\["building"="yes"\]/);
    // a bare building=yes must not be matched by the "homes" selector
    assert.doesNotMatch(q, /\^\(.*\byes\b.*\)\$/);
  });

  it("parses places, classifies drivers and reads counts in order", () => {
    const data = parseResponse(
      [
        {
          type: "node",
          id: 1,
          lat: 19.7001,
          lon: 72.77,
          tags: { shop: "convenience", name: "Sai Stores" },
        },
        { type: "way", id: 2, center: { lat: 19.701, lon: 72.771 }, tags: { amenity: "school" } },
        { type: "node", id: 3, lat: 19.7, lon: 72.77, tags: { amenity: "grave_yard" } },
        { type: "count", id: 0, tags: { total: "42" } },
        { type: "count", id: 0, tags: { total: "310" } },
        { type: "count", id: 0, tags: { total: "900" } },
      ],
      19.7,
      72.77,
      500,
      kirana,
    );
    assert.equal(data.same.length, 1);
    assert.equal(data.same[0].name, "Sai Stores");
    assert.equal(data.drivers.length, 1);
    assert.equal(data.drivers[0].kind, "school");
    assert.equal(data.totalShops, 42);
    assert.equal(data.homes, 310);
    assert.equal(data.unlabeledBuildings, 900);
  });
});

describe("untagged buildings", () => {
  it("count for less than tagged homes, so building=yes cannot inflate demand", () => {
    const tagged = assess(area({ totalShops: 10, homes: 300 }), kirana);
    const untagged = assess(area({ totalShops: 10, homes: 0, unlabeledBuildings: 300 }), kirana);
    assert.ok(untagged.demandScore < tagged.demandScore);
    assert.ok(untagged.demandScore > assess(area({ totalShops: 10 }), kirana).demandScore);
  });
});

describe("location snapshot", () => {
  const point = { lat: 19.7, lon: 72.77 };
  const data = area({
    radiusM: 500,
    totalShops: 40,
    homes: 120,
    unlabeledBuildings: 200,
    same: [
      { id: "n1", name: "Sai Stores", lat: 19.7009, lon: 72.77, distanceM: 100 },
      { id: "n2", name: null, lat: 19.703, lon: 72.77, distanceM: 333 },
    ],
    drivers: [
      { id: "d1", name: "City School", lat: 19.7, lon: 72.771, distanceM: 105, kind: "school" },
    ],
  });

  it("re-scores a stored snapshot exactly like the live result", () => {
    const live = assess(data, kirana);
    const snap = snapshotFromArea(data, "kirana", point, "Palghar");
    const again = assessSnapshot(snap);
    assert.equal(again.opportunity, live.opportunity);
    assert.equal(again.demandScore, live.demandScore);
    assert.equal(again.competitionScore, live.competitionScore);
    assert.equal(snap.driverCounts.school, 1);
    assert.equal(snap.label, "Palghar");
  });

  it("round-trips through JSON and sanitizeSnapshot", () => {
    const snap = snapshotFromArea(data, "kirana", point);
    const back = sanitizeSnapshot(JSON.parse(JSON.stringify(snap)));
    assert.ok(back);
    assert.equal(back.same.length, 2);
    assert.equal(back.driverPoints[0].kind, "school");
    assert.equal(assessSnapshot(back).opportunity, assessSnapshot(snap).opportunity);
  });

  it("recomputes distances and clamps counts so a hand-edited request cannot flatter the spot", () => {
    const snap = snapshotFromArea(data, "kirana", point);
    const forged = {
      ...snap,
      totalShops: -5,
      homes: 1e12,
      same: [{ name: "Rival", lat: 19.7001, lon: 72.77, distanceM: 499 }],
    };
    const back = sanitizeSnapshot(forged);
    assert.ok(back);
    assert.equal(back.totalShops, 0);
    assert.ok(back.homes <= 1_000_000);
    assert.ok(back.same[0].distanceM < 30, `distance was ${back.same[0].distanceM}`);
  });

  it("drops points outside the radius and rejects malformed snapshots", () => {
    const snap = snapshotFromArea(data, "kirana", point);
    const far = sanitizeSnapshot({ ...snap, same: [{ name: "Far", lat: 20.5, lon: 73.5, distanceM: 1 }] });
    assert.equal(far?.same.length, 0);
    assert.equal(sanitizeSnapshot(null), null);
    assert.equal(sanitizeSnapshot({ ...snap, lat: 120 }), null);
    assert.equal(sanitizeSnapshot({ ...snap, radiusM: 50000 }), null);
    assert.equal(sanitizeSnapshot({ ...snap, categoryId: "spaceship" }), null);
  });
});
