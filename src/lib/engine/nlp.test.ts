import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { CALIBRATION, SCORE_WEIGHTS, mlConsistency, verdictFromScore } from "./config.ts";
import { DEMO_IDEAS, SIM_FEATURE_ORDER } from "./demo.ts";
import { extractScores } from "./features.ts";
import { buildNextSteps, buildStrengths, buildWeaknesses } from "./insights.ts";
import { snapshotFromArea, type AreaData } from "../location/score.ts";
import { analyzeText, genericRatio, specificityScore, tokenize } from "./nlp.ts";
import { calibrate, weightedFinalScore } from "./scoring.ts";
import { ML_CLASS_NAMES, type StartupInput } from "./types.ts";

describe("scoring engine", () => {
  it("weights sum to 1", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(Number(sum.toFixed(2)), 1);
  });

  it("maps thresholds to verdicts", () => {
    assert.equal(verdictFromScore(80), "Highly Promising");
    assert.equal(verdictFromScore(60), "Promising");
    assert.equal(verdictFromScore(40), "High Risk");
    assert.equal(verdictFromScore(10), "Needs Major Improvement");
  });

  it("computes the documented formula", () => {
    const scores = {
      marketDemand: 80,
      problemFit: 80,
      innovation: 80,
      competition: 80,
      businessPotential: 80,
      scalability: 80,
    };
    const raw =
      scores.marketDemand * SCORE_WEIGHTS.marketDemand +
      scores.problemFit * SCORE_WEIGHTS.problemFit +
      scores.innovation * SCORE_WEIGHTS.innovation +
      scores.competition * SCORE_WEIGHTS.competition +
      scores.businessPotential * SCORE_WEIGHTS.businessPotential +
      scores.scalability * SCORE_WEIGHTS.scalability;
    assert.equal(Math.round(raw), 80);
  });
});

describe("nlp", () => {
  it("drops stopwords and lowercases", () => {
    const tokens = tokenize("The Students are Learning with an App");
    assert.ok(!tokens.includes("the"));
    assert.ok(tokens.length >= 3);
  });

  it("extracts keywords from a description", () => {
    const result = analyzeText([
      "AI study planner helps college students organize coursework and exam revision",
    ]);
    assert.ok(result.tokenCount > 3);
    assert.ok(result.keywords.length > 0);
  });

  it("does not over-stem ordinary words", () => {
    const tokens = tokenize("answers interviews professionals");
    assert.ok(tokens.includes("answer") || tokens.includes("answers"));
    assert.ok(!tokens.includes("answ"));
  });
});

describe("Unicode-aware tokenizer", () => {
  it("keeps Hindi content words and drops Hindi function words", () => {
    const t = tokenize("यह एक ऐप है जो छात्रों को परीक्षा की तैयारी में मदद करता है");
    assert.ok(t.includes("ऐप"));
    assert.ok(t.includes("छात्रों"));
    assert.ok(t.includes("परीक्षा"));
    for (const stop of ["है", "को", "की", "में", "जो", "यह", "एक"]) assert.ok(!t.includes(stop), stop);
  });

  it("handles Marathi and romanized Hinglish stopwords", () => {
    const mr = tokenize("हा अॅप विद्यार्थ्यांना परीक्षेसाठी मदत करतो आणि शेतकरी साठी आहे");
    assert.ok(mr.includes("विद्यार्थ्यांना"));
    for (const stop of ["हा", "आणि", "आहे", "साठी"]) assert.ok(!mr.includes(stop), stop);
    const hing = tokenize("yeh app students ke liye hai aur bahut easy hai");
    assert.deepEqual(hing, ["app", "student", "easy"]);
  });

  it("treats zero-width joiners as part of a word, not a separator", () => {
    assert.deepEqual(tokenize("क्\u200dया"), tokenize("क्या"));
  });

  it("does not mangle ordinary English words", () => {
    const t = tokenize("syllabus analysis business answers");
    assert.deepEqual(t, ["syllabus", "analysis", "business", "answer"]);
  });
});

describe("text specificity", () => {
  const vague =
    "An app for everyone to solve every problem. It is better, easier and best for all users with a great user experience.";
  const concrete =
    "StudyAI turns a syllabus into a weekly plan and flags topics a student keeps missing, instead of a generic calendar template; pilot with 30 students in 8 weeks.";

  it("scores concrete text far above vague text", () => {
    assert.ok(specificityScore(concrete, 45) - specificityScore(vague, 45) >= 30);
  });

  it("does not reward length alone", () => {
    const padded = Array(12).fill(vague).join(" ");
    assert.ok(specificityScore(padded, 45) < 25);
  });

  it("measures filler as a share of tokens", () => {
    assert.ok(genericRatio(tokenize(vague)) > 0.3);
    assert.ok(genericRatio(tokenize(concrete)) < 0.05);
  });
});

describe("recalibrated scoring", () => {
  const base: StartupInput = (({ slug: _slug, ...rest }) => rest)(DEMO_IDEAS[0]);
  const final = (i: StartupInput) => weightedFinalScore(extractScores(i).scores);
  const vagueIdea: StartupInput = {
    ...base,
    description: "An app for everyone everywhere that solves every problem using AI platform for users worldwide today",
    problemStatement: "Everyone has a big problem and needs a solution right now for their daily life",
    differentiator: "We are the best platform with AI and better user experience than any others",
    targetCustomer: "everyone",
    targetMarket: "global market",
    revenueModel: "ads maybe",
    geographicMarket: "Global",
    estimatedCustomers: 1_000_000_000,
  };
  const sliders = (v: number) => ({ demandPerception: v, problemSeverity: v, scalability: v });

  it("calibration is a monotonic stretch centred on 50", () => {
    assert.equal(calibrate(CALIBRATION.center), 50);
    assert.ok(calibrate(60) > calibrate(50));
  });

  it("a vague pitch cannot be rescued by maxing every slider", () => {
    const gamed = final({ ...vagueIdea, ...sliders(100) });
    assert.ok(gamed < 50, `gamed score ${gamed}`);
    assert.ok(verdictFromScore(gamed) !== "Promising" && verdictFromScore(gamed) !== "Highly Promising");
  });

  it("a specific idea with pessimistic sliders still beats a vague idea with perfect sliders", () => {
    assert.ok(final({ ...base, ...sliders(0) }) > final({ ...vagueIdea, ...sliders(100) }) + 20);
  });

  it("sliders move the score, but only a little", () => {
    const lo = final({ ...base, ...sliders(0) });
    const hi = final({ ...base, ...sliders(100) });
    assert.ok(hi > lo, "sliders should still matter");
    assert.ok(hi - lo <= 15, `slider swing ${hi - lo}`);
  });

  it("uses the whole range instead of clustering", () => {
    const scores = [
      ...DEMO_IDEAS.map(({ slug: _s, ...i }) => final(i)),
      final({ ...vagueIdea, ...sliders(100) }),
      final({ ...vagueIdea, description: "app", problemStatement: "problem", differentiator: "better", competitors: [], expectedPricing: null, ...sliders(50) }),
    ];
    assert.ok(Math.max(...scores) - Math.min(...scores) >= 45, JSON.stringify(scores));
    const verdicts = new Set(scores.map(verdictFromScore));
    assert.ok(verdicts.size >= 3, [...verdicts].join(","));
  });

  it("scores the same idea written in Hindi close to the English version", () => {
    const hindi: StartupInput = {
      ...base,
      description: "यह एक ऐप है जो कॉलेज के छात्रों को परीक्षा की तैयारी के लिए साप्ताहिक योजना बनाने में मदद करता है और कमजोर विषयों को पहचानता है। हम 30 छात्रों के साथ 8 हफ्तों में पायलट करेंगे।",
      problemStatement: "छात्र परीक्षा से पहले रटते हैं क्योंकि उनके पास वास्तविक साप्ताहिक योजना नहीं होती है और कमजोर विषय पहचान में नहीं आते।",
      differentiator: "योजना छात्र के अपने पाठ्यक्रम और पिछले मॉक स्कोर से बनाई जाती है, सामान्य कैलेंडर के बजाय।",
      targetCustomer: "कॉलेज के छात्रों",
      targetMarket: "पुणे में 300 छात्रों",
      revenueModel: "सब्सक्रिप्शन ₹99 प्रति माह",
    };
    assert.ok(Math.abs(final(hindi) - final(base)) <= 12, `${final(hindi)} vs ${final(base)}`);
  });
});

describe("ML consistency check", () => {
  it("uses the same four names as the rules verdicts", () => {
    for (const name of ML_CLASS_NAMES) assert.ok(["Highly Promising", "Promising", "High Risk", "Needs Major Improvement"].includes(name));
    assert.equal(verdictFromScore(0), ML_CLASS_NAMES[0]);
    assert.equal(verdictFromScore(100), ML_CLASS_NAMES[3]);
  });

  it("classifies agreement by class distance", () => {
    assert.equal(mlConsistency("Promising", "Promising").level, "agrees");
    assert.equal(mlConsistency("Promising", "High Risk").level, "close");
    assert.equal(mlConsistency("Highly Promising", "High Risk").level, "differs");
    assert.equal(mlConsistency("Promising", "Not Recommended").label, "ML check unavailable");
  });

  it("the exported forest matches the app's feature and class contract", () => {
    const forest = JSON.parse(readFileSync(new URL("./model/forest.json", import.meta.url), "utf8"));
    assert.deepEqual(forest.classNames, [...ML_CLASS_NAMES]);
    assert.deepEqual(forest.featureNames, SIM_FEATURE_ORDER);
    assert.equal(typeof forest.datasetId, "string");
    const features = extractScores(DEMO_IDEAS[0]).features;
    for (const name of forest.featureNames) assert.ok(name in features, `feature ${name} missing from the engine`);
  });
});

describe("map check feeds the score", () => {
  const base: StartupInput = (({ slug: _slug, ...rest }) => rest)(DEMO_IDEAS[0]);
  const point = { lat: 19.7, lon: 72.77 };
  const places = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `n${i}`,
      name: `Shop ${i}`,
      lat: 19.7 + i * 0.0001,
      lon: 72.77,
      distanceM: 20 + i * 15,
    }));
  const area = (p: Partial<AreaData>): AreaData => ({
    radiusM: 500,
    same: [],
    drivers: [],
    totalShops: 0,
    homes: 0,
    ...p,
  });
  const drivers = (kind: "college" | "station" | "school", n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `${kind}${i}`, name: null, lat: 19.7, lon: 72.771, distanceM: 120, kind }));
  const busyOpen = snapshotFromArea(
    area({ totalShops: 90, homes: 400, same: places(1), drivers: [...drivers("college", 3), ...drivers("station", 1)] }),
    "cafe",
    point,
  );
  const crowdedQuiet = snapshotFromArea(area({ totalShops: 25, homes: 30, same: places(24) }), "cafe", point);
  const emptyMap = snapshotFromArea(area({}), "cafe", point);

  it("leaves ideas without a location exactly as before", () => {
    const a = extractScores(base).scores;
    const b = extractScores({ ...base, location: null }).scores;
    assert.deepEqual(a, b);
  });

  it("a busy, uncrowded spot lifts demand and competition; a crowded, quiet one lowers them", () => {
    const none = extractScores(base).scores;
    const good = extractScores({ ...base, location: busyOpen }).scores;
    const bad = extractScores({ ...base, location: crowdedQuiet }).scores;
    assert.ok(good.marketDemand > none.marketDemand, `${good.marketDemand} vs ${none.marketDemand}`);
    assert.ok(good.competition >= none.competition);
    assert.ok(bad.competition < none.competition, `${bad.competition} vs ${none.competition}`);
    assert.ok(bad.marketDemand < good.marketDemand);
  });

  it("counts the map for less when OpenStreetMap has almost nothing mapped", () => {
    const none = extractScores(base).scores.marketDemand;
    const thin = extractScores({ ...base, location: emptyMap }).scores.marketDemand;
    const crowded = extractScores({ ...base, location: crowdedQuiet }).scores.marketDemand;
    // an empty map pulls demand down, but by less than a mapped-and-quiet area would
    assert.ok(thin <= none);
    assert.ok(none - thin <= none - crowded + 1);
  });

  it("mentions the map check in the explanations", () => {
    const e = extractScores({ ...base, location: crowdedQuiet });
    assert.match(e.explanations.marketDemand, /map check/i);
    assert.match(e.explanations.competition, /similar shops/i);
    assert.doesNotMatch(extractScores(base).explanations.competition, /map check/i);
  });

  it("adds location strengths, weaknesses and a walk-the-spot step", () => {
    const withCrowded = { ...base, location: crowdedQuiet };
    const weak = buildWeaknesses(extractScores(withCrowded).scores, withCrowded);
    assert.ok(weak.some((w) => /competition at the chosen spot/i.test(w.title)));
    const withGood = { ...base, location: busyOpen };
    const strong = buildStrengths(extractScores(withGood).scores, withGood);
    assert.ok(strong.some((x) => /busy surroundings/i.test(x.title)));
    const steps = buildNextSteps(withGood);
    assert.equal(steps.length, 6);
    assert.deepEqual(steps.map((x) => x.step), [1, 2, 3, 4, 5, 6]);
    assert.ok(/walk the spot/i.test(steps[1].title));
    assert.equal(buildNextSteps(base).length, 5);
  });
});
