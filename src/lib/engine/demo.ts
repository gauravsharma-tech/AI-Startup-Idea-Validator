import type { FeatureVector, StartupInput } from "./types.ts";

export const DEMO_IDEAS: (StartupInput & { slug: string })[] = [
  {
    slug: "study-ai",
    startupName: "StudyAI",
    description:
      "StudyAI is an AI study planner for college students. It turns a syllabus into a weekly plan, spaces revision before exams, and flags topics the student keeps missing. It helps students who juggle lectures, labs, and part-time work and cannot keep a consistent revision system.",
    industry: "EdTech",
    stage: "Prototype",
    problemStatement:
      "College students cram before exams because they do not have a realistic weekly plan tied to their actual syllabus and weak topics.",
    targetCustomer: "College students in degree programs",
    problemFrequency: "Very Frequent",
    problemSeverity: 78,
    targetMarket: "Undergraduate students at universities in India",
    geographicMarket: "National",
    estimatedCustomers: 800000,
    expectedPricing: 199,
    demandPerception: 76,
    businessModel: "Freemium",
    revenueModel: "Free planner with a paid AI tutor and exam-pack subscription",
    competitors: ["Notion", "MyStudyLife", "Quizlet"],
    differentiator:
      "Plans are generated from the student’s own syllabus and past mock scores rather than a generic calendar template.",
    scalability: 82,
  },
  {
    slug: "green-mile",
    startupName: "GreenMile",
    description:
      "GreenMile is an eco-friendly last-mile delivery service for local retailers. Batched bicycle and EV routes replace fragmented bike-courier trips so neighborhood shops can offer same-day delivery with a lower emissions footprint.",
    industry: "ClimateTech",
    stage: "MVP",
    problemStatement:
      "Local retailers lose orders to national apps and cannot offer affordable same-day delivery without expensive, high-emission courier trips.",
    targetCustomer: "Independent retailers and neighborhood grocery stores",
    problemFrequency: "Frequent",
    problemSeverity: 71,
    targetMarket: "Urban independent retail",
    geographicMarket: "Regional",
    estimatedCustomers: 12000,
    expectedPricing: 45,
    demandPerception: 64,
    businessModel: "Commission",
    revenueModel: "Per-delivery fee plus a small commission on order value",
    competitors: ["Dunzo", "Shadowfax", "local bike couriers"],
    differentiator:
      "Route batching for a dense neighborhood plus a reported emissions figure per delivery, not city-wide gig dispatch.",
    scalability: 58,
  },
  {
    slug: "harvest-local",
    startupName: "HarvestLocal",
    description:
      "HarvestLocal is a marketplace that lets nearby households and restaurants buy surplus produce directly from local farmers. Listings, pickup slots, and simple payments replace informal WhatsApp groups that drop orders and waste harvest.",
    industry: "E-commerce",
    stage: "Early Startup",
    problemStatement:
      "Small farmers dump unsold perishable produce because they lack a reliable local demand channel besides wholesale mandis.",
    targetCustomer: "Smallholder farmers and local restaurants",
    problemFrequency: "Frequent",
    problemSeverity: 80,
    targetMarket: "Peri-urban farming belts supplying a city",
    geographicMarket: "Regional",
    estimatedCustomers: 25000,
    expectedPricing: 0,
    demandPerception: 72,
    businessModel: "Marketplace",
    revenueModel: "Commission on each fulfilled order, plus optional logistics add-on",
    competitors: ["BigBasket", "local mandis", "Farmizen"],
    differentiator:
      "Same-day surplus lots with pickup windows, not a full grocery catalog competing with national apps.",
    scalability: 61,
  },
  {
    slug: "rehearse",
    startupName: "Rehearse",
    description:
      "Rehearse is an AI interview coach for job seekers. It runs timed mock interviews for a target role, scores answers against a rubric, and gives specific rewrites. It helps working professionals who cannot schedule enough live mock sessions.",
    industry: "AI",
    stage: "MVP",
    problemStatement:
      "Job seekers underperform in interviews because they practice too rarely and get generic tips instead of role-specific feedback.",
    targetCustomer: "Working professionals preparing for job changes",
    problemFrequency: "Occasional",
    problemSeverity: 74,
    targetMarket: "Mid-level professionals in tech and business roles",
    geographicMarket: "Global",
    estimatedCustomers: 2000000,
    expectedPricing: 799,
    demandPerception: 70,
    businessModel: "Subscription",
    revenueModel: "Monthly subscription with a limited free mock interview",
    competitors: ["Pramp", "Interviewing.io", "ChatGPT"],
    differentiator:
      "Role-specific rubrics and rewrite suggestions on the user’s own answers, not a generic question bank.",
    scalability: 86,
  },
  {
    slug: "care-sync",
    startupName: "CareSync",
    description:
      "CareSync is an AI-driven remote chronic care and post-discharge monitoring platform for tier-2 city clinics. It tracks patient recovery vitals through multilingual WhatsApp check-ins and triage algorithms that flag clinical deterioration directly to on-call nurses before emergency readmissions happen.",
    industry: "HealthTech",
    stage: "MVP",
    problemStatement:
      "Post-surgery and chronic patients discharged from tier-2 hospitals receive zero structured follow-up, causing preventable complications and sudden emergency re-hospitalizations.",
    targetCustomer: "Independent multi-specialty hospitals, nursing homes, and chronic patient families",
    problemFrequency: "Very Frequent",
    problemSeverity: 84,
    targetMarket: "Discharged cardiac, orthopedic, and diabetic patients in tier-2 and tier-3 Indian cities",
    geographicMarket: "National",
    estimatedCustomers: 450000,
    expectedPricing: 499,
    demandPerception: 78,
    businessModel: "Subscription",
    revenueModel: "Monthly per-patient monitoring subscription split with partner clinics",
    competitors: ["Practo", "Portea Medical", "Manual phone follow-ups"],
    differentiator:
      "Automated WhatsApp voice and regional text bots that require no new mobile apps for elderly patients, combined with clinical risk scoring for doctors.",
    scalability: 80,
  },
  {
    slug: "cash-bridge",
    startupName: "CashBridge",
    description:
      "CashBridge is an automated working-capital liquidity engine for MSME construction subcontractors and trade suppliers. It synchronizes GST e-invoices and ERP milestones to unlock instant invoice factoring within 48 hours, eliminating the chronic 60-to-90 day payment delays that cripple subcontractor cash flows and payroll.",
    industry: "FinTech",
    stage: "Prototype",
    problemStatement:
      "Commercial subcontractors and trade vendors wait 60 to 90 days for verified invoice payments from principal contractors, causing acute cash-flow droughts and payroll defaults.",
    targetCustomer: "MSME construction trade contractors, HVAC installers, and electrical suppliers",
    problemFrequency: "Frequent",
    problemSeverity: 88,
    targetMarket: "Registered construction and infrastructure MSME trade contractors across India",
    geographicMarket: "National",
    estimatedCustomers: 220000,
    expectedPricing: 0,
    demandPerception: 82,
    businessModel: "Commission",
    revenueModel: "1.5% to 2.2% dynamic transaction discounting fee per financed invoice",
    competitors: ["KredX", "M1xchange", "Informal bridge loans"],
    differentiator:
      "Automated contract lien validation and real-time GST reconciliation directly integrated with tier-1 builder accounting systems for instant collateral-free credit.",
    scalability: 85,
  },
  {
    slug: "api-sentinel",
    startupName: "ApiSentinel",
    description:
      "ApiSentinel is an autonomous API contract guard and breaking-change defense platform for distributed microservices. It intercepts pull requests, compares schema modifications against live production traffic, and blocks breaking payload changes before deployment. It protects engineering teams from silent regressions and broken third-party partner integrations.",
    industry: "SaaS",
    stage: "Early Startup",
    problemStatement:
      "Engineering teams push breaking API schema changes that slip through unit tests, causing silent production outages in mobile apps and broken client integrations.",
    targetCustomer: "Engineering leaders, platform architects, and backend teams in high-velocity tech companies",
    problemFrequency: "Frequent",
    problemSeverity: 76,
    targetMarket: "Mid-market software companies and developer platforms globally",
    geographicMarket: "Global",
    estimatedCustomers: 90000,
    expectedPricing: 3999,
    demandPerception: 74,
    businessModel: "Subscription",
    revenueModel: "Tiered monthly developer seat subscription with usage-based API traffic analysis",
    competitors: ["Postman API Governance", "Pact", "SwaggerHub"],
    differentiator:
      "Zero SDK installation needed; analyzes OpenTelemetry traces and Git pull requests to simulate backward-compatibility breaks before code merges.",
    scalability: 92,
  },
  {
    slug: "cold-trace",
    startupName: "ColdTrace",
    description:
      "ColdTrace provides affordable IoT temperature telemetry and automated compliance auditing for refrigerated pharma and dairy logistics. Low-cost Bluetooth Low Energy sensor beacons transmit real-time thermal readings to driver smartphones, alerting fleet dispatchers to cooling failures before perishable loads spoil.",
    industry: "Transportation",
    stage: "MVP",
    problemStatement:
      "Perishable dairy and pharmaceutical distributors lose up to 18% of shipments to in-transit spoilage because temperature spikes inside refrigerated trucks go unnoticed until final offloading.",
    targetCustomer: "Cold-chain fleet operators, pharmaceutical distributors, and dairy processors",
    problemFrequency: "Very Frequent",
    problemSeverity: 86,
    targetMarket: "Regional temperature-controlled logistics fleets and distributor networks",
    geographicMarket: "Regional",
    estimatedCustomers: 40000,
    expectedPricing: 1200,
    demandPerception: 76,
    businessModel: "Subscription",
    revenueModel: "Monthly sensor telemetry SaaS subscription plus refundable beacon hardware deposit",
    competitors: ["Sensitech", "Roambee", "Disposable USB temperature loggers"],
    differentiator:
      "Ultra-low-cost BLE sensor beacons costing 70% less than cellular trackers, utilizing smartphone mesh relays along delivery routes.",
    scalability: 78,
  },
  {
    slug: "clause-wise",
    startupName: "ClauseWise",
    description:
      "ClauseWise is a plain-language AI contract scanner and risk annotator tailored for independent consultants, freelance creators, and boutique design studios. It analyzes complex service contracts, flags punitive indemnity clauses, unlimited revisions, and unfair payment milestones, and generates balanced, industry-standard counter-proposals.",
    industry: "Other",
    stage: "Prototype",
    problemStatement:
      "Freelancers and small agency founders sign client contracts containing hidden liability clauses, IP forfeiture, and 90-day payment delays because hiring legal counsel is cost-prohibitive.",
    targetCustomer: "Independent contractors, creative freelancers, and boutique service agencies",
    problemFrequency: "Occasional",
    problemSeverity: 80,
    targetMarket: "Global English-speaking freelance economy and agency contractors",
    geographicMarket: "Global",
    estimatedCustomers: 2500000,
    expectedPricing: 599,
    demandPerception: 72,
    businessModel: "Freemium",
    revenueModel: "Free basic contract risk scan with monthly unlimited negotiation rewrites and redlining",
    competitors: ["LegalZoom", "ChatGPT", "Traditional boutique lawyers"],
    differentiator:
      "Trained on thousands of freelancer disputes with clause-by-clause fair market comparisons and one-click copyable counter-amendments.",
    scalability: 88,
  },
  {
    slug: "kitchen-pulse",
    startupName: "KitchenPulse",
    description:
      "KitchenPulse is an AI inventory forecasting and waste-minimization platform for multi-brand cloud kitchens and quick-service restaurant chains. It correlates historical food delivery trends, local weather data, and prep times to generate precise hourly ingredient prep sheets, slashing kitchen food waste by over 30%.",
    industry: "FoodTech",
    stage: "Early Startup",
    problemStatement:
      "Cloud kitchens operate on slim 5% margins and routinely discard 15% of perishable inventory each week because static spreadsheets fail to predict volatile daily order swings.",
    targetCustomer: "Cloud kitchen owners, QSR franchise operators, and food commissary managers",
    problemFrequency: "Very Frequent",
    problemSeverity: 83,
    targetMarket: "Urban cloud kitchens and multi-brand delivery hubs in metropolitan cities",
    geographicMarket: "National",
    estimatedCustomers: 65000,
    expectedPricing: 2499,
    demandPerception: 79,
    businessModel: "Subscription",
    revenueModel: "Flat monthly subscription per operating kitchen outlet",
    competitors: ["Petpooja", "Posist", "Manual Excel tracking"],
    differentiator:
      "Direct API integration with Swiggy and Zomato menus with hyper-local weather adjustments to generate hourly prep lists rather than generic weekly reorder points.",
    scalability: 82,
  },
];

// ---------------------------------------------------------------------------
// Simulated population (used to calibrate the scoring and to train the forest).
//
// Every simulated idea has a hidden quality q in [0, 1]. The founder-facing
// fields are generated from q with noise: better ideas tend to be described more
// specifically, but founders also over-rate themselves, so the sliders are only
// weakly informative. The label is q plus noise. This is a simulation of how
// inputs look, NOT data about real startups. Run through the real engine so the
// feature distribution matches what the app sees:
//
//   node --experimental-strip-types --no-warnings -e \
//     "import('./src/lib/engine/demo.ts').then(async m => process.stdout.write(await m.simulatedDatasetCsv(4000, 42)))" \
//     > data/synthetic_startups.csv
//   python backend/ml/train.py
// ---------------------------------------------------------------------------

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: Rng) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const clip = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

type Kernel = {
  industry: string;
  product: string;
  customer: string;
  customers: string;
  pain: string;
  cause: string;
  mech: string;
  alt: string;
  data: string;
  unit: string;
  hi?: { product: string; customers: string; pain: string; mech: string };
};

const KERNELS: Kernel[] = [
  {
    industry: "EdTech",
    product: "study planner",
    customer: "college student",
    customers: "college students",
    pain: "cram before exams without a realistic revision plan",
    cause: "their weekly schedule is not tied to the syllabus or to weak topics",
    mech: "turns the syllabus into a weekly plan and flags topics a student keeps missing",
    alt: "a generic calendar template",
    data: "past mock-test scores",
    unit: "student",
    hi: {
      product: "स्टडी प्लानर ऐप",
      customers: "कॉलेज छात्रों",
      pain: "परीक्षा से पहले रटते हैं क्योंकि उनके पास असली साप्ताहिक योजना नहीं होती",
      mech: "सिलेबस से साप्ताहिक योजना बनाता है और कमजोर विषय पहचानता है",
    },
  },
  {
    industry: "FoodTech",
    product: "farm-to-home marketplace",
    customer: "urban household",
    customers: "urban households",
    pain: "pay high prices for vegetables that are days old",
    cause: "produce passes through three middlemen before reaching the city",
    mech: "connects nearby farmers to housing societies with next-morning delivery",
    alt: "a national grocery chain",
    data: "farmer harvest schedules",
    unit: "order",
    hi: {
      product: "किसान-से-घर मार्केटप्लेस",
      customers: "शहरी परिवारों",
      pain: "बासी सब्जियाँ ऊँचे दाम पर खरीदते हैं क्योंकि बीच में कई बिचौलिए होते हैं",
      mech: "पास के किसानों को हाउसिंग सोसाइटी से जोड़ता है और अगली सुबह डिलीवरी करता है",
    },
  },
  {
    industry: "HealthTech",
    product: "medication reminder app",
    customer: "elderly patient",
    customers: "elderly patients",
    pain: "miss doses because routines change after discharge",
    cause: "paper instructions are unclear and nobody follows up",
    mech: "sends voice reminders in the patient's language and alerts a family member after a missed dose",
    alt: "a plain phone alarm",
    data: "the prescription list",
    unit: "patient",
    hi: {
      product: "दवा रिमाइंडर ऐप",
      customers: "बुजुर्ग मरीजों",
      pain: "अस्पताल से छुट्टी के बाद दवा लेना भूल जाते हैं",
      mech: "अपनी भाषा में आवाज़ वाले रिमाइंडर भेजता है और दवा छूटने पर परिवार को बताता है",
    },
  },
  {
    industry: "E-commerce",
    product: "local shop ordering tool",
    customer: "neighbourhood shopkeeper",
    customers: "neighbourhood shopkeepers",
    pain: "lose evening customers to apps because they cannot take online orders",
    cause: "setting up a catalogue and delivery takes more time than they have",
    mech: "builds a catalogue from a photo of the shelf and shares an order link on WhatsApp",
    alt: "a full e-commerce platform with high commission",
    data: "shelf photos",
    unit: "shop",
    hi: {
      product: "लोकल दुकान ऑर्डर टूल",
      customers: "मोहल्ले के दुकानदारों",
      pain: "ऑनलाइन ऑर्डर न ले पाने से शाम के ग्राहक खो देते हैं",
      mech: "शेल्फ की फोटो से कैटलॉग बनाता है और व्हाट्सऐप पर ऑर्डर लिंक भेजता है",
    },
  },
  {
    industry: "FinTech",
    product: "invoice tracking wallet",
    customer: "small business owner",
    customers: "small business owners",
    pain: "wait 60 days for payments and lose track of unpaid invoices",
    cause: "invoices live in chats and notebooks",
    mech: "sends automatic payment reminders and shows a weekly cash position",
    alt: "a spreadsheet",
    data: "bank statement imports",
    unit: "business",
  },
  {
    industry: "SaaS",
    product: "meeting notes dashboard",
    customer: "project manager",
    customers: "project managers",
    pain: "lose action items after meetings",
    cause: "decisions are scattered across calls and chats",
    mech: "extracts action items from call transcripts and assigns owners with due dates",
    alt: "manual note taking",
    data: "call transcripts",
    unit: "team",
  },
  {
    industry: "ClimateTech",
    product: "carbon tracker",
    customer: "factory manager",
    customers: "factory managers",
    pain: "cannot measure emissions per product line",
    cause: "energy bills are monthly and not split by machine",
    mech: "reads smart-meter data per machine and reports emissions per batch",
    alt: "a yearly consultant audit",
    data: "smart-meter readings",
    unit: "plant",
  },
  {
    industry: "Transportation",
    product: "office carpool app",
    customer: "office commuter",
    customers: "office commuters",
    pain: "spend two hours a day in traffic and pay for a parked car",
    cause: "colleagues on similar routes never find each other",
    mech: "matches colleagues on the same route and splits fuel cost per trip",
    alt: "a ride-hailing app",
    data: "office addresses",
    unit: "route",
  },
  {
    industry: "AI",
    product: "interview coach",
    customer: "fresh graduate",
    customers: "fresh graduates",
    pain: "freeze in interviews because they never practise out loud",
    cause: "mock interviews need a friend or a paid mentor",
    mech: "asks role-specific questions and scores answers on structure and clarity",
    alt: "reading question lists",
    data: "role descriptions",
    unit: "candidate",
  },
];

const VAGUE_DESC = [
  "An app for everyone to solve problems using AI. It is a better and easier platform with a great user experience.",
  "A smart platform that helps people do things in a better and simpler way for all users around the world.",
  "An innovative solution for everyone. Our platform is unique and revolutionary and makes life easy.",
  "AI powered app that will change the world and help many people with many things.",
];
const VAGUE_PROBLEM = [
  "People have a big problem and need a better solution for their daily life.",
  "Everyone faces many problems and there is no good solution right now.",
  "Things are hard for users and they need something simple and easy.",
];
const VAGUE_DIFF = [
  "We are the best platform with better user experience and innovative AI for everyone.",
  "Our solution is better and easier than the others and it is unique.",
  "It is better because it is good and uses the latest technology.",
];
const VAGUE_CUSTOMER = ["everyone", "all users", "people", "anyone who needs it"];
const VAGUE_MARKET = ["everyone in the world", "global market", "all people", "huge market"];
const VAGUE_REVENUE = ["ads maybe", "will decide later", "some charges", "not sure yet"];
const RIVALS = [
  "Notion", "Quizlet", "Swiggy", "Zomato", "Paytm", "Khatabook", "Practo", "Amazon",
  "Flipkart", "Zoho", "Slack", "BlaBlaCar", "Duolingo", "Byju's", "Dunzo", "Google Keep",
];
const CITIES = ["Pune", "Nashik", "Indore", "Jaipur", "Kochi", "Surat", "Lucknow", "Mysuru"];

function tierOf(q: number, r: Rng): 0 | 1 | 2 {
  const t = q + gauss(r) * 0.12;
  return t >= 0.62 ? 2 : t >= 0.33 ? 1 : 0;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type SimulatedIdea = { input: StartupInput; quality: number; label: number };

export function simulateIdea(r: Rng): SimulatedIdea {
  const q = clip(0.5 + gauss(r) * 0.22, 0, 1);
  const k = pick(r, KERNELS);
  const name = `Sim${Math.floor(r() * 9000 + 1000)}`;
  const city = pick(r, CITIES);
  const city2 = pick(r, CITIES);
  const n = pick(r, [20, 30, 50, 120, 300]);
  const weeks = pick(r, [6, 8, 10, 12]);
  const rival = pick(r, RIVALS);
  const price = Math.round(Math.exp(Math.log(20) + r() * Math.log(250)));
  const useHindi = k.hi !== undefined && r() < 0.18;

  const desc = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_DESC);
    if (useHindi && k.hi)
      return `${name} एक ${k.hi.product} है जो ${k.hi.customers} के लिए बना है। यह ${k.hi.mech}। ${k.hi.customers} जो ${k.hi.pain}, उनकी मदद करता है${t === 2 ? `। हम ${weeks} हफ्तों में ${n} ${k.hi.customers} के साथ पायलट करेंगे` : ""}।`;
    const base = `${name} is a ${k.product} for ${k.customers}. It ${k.mech}.`;
    if (t === 1) return `${base} It helps people who ${k.pain}.`;
    return `${base} It helps ${k.customers} who ${k.pain}, instead of relying on ${k.alt}. We plan a pilot with ${n} ${k.customers} in ${city} within ${weeks} weeks.`;
  })();

  const problem = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_PROBLEM);
    if (useHindi && k.hi) return `${k.hi.customers} ${k.hi.pain}।`;
    if (t === 1) return `${cap(k.customers)} ${k.pain} because ${k.cause}.`;
    return `${cap(k.customers)} ${k.pain} because ${k.cause}. Today they rely on ${k.alt}, which costs about ${pick(r, [300, 500, 800, 1200])} rupees a month per ${k.unit}.`;
  })();

  const diff = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_DIFF);
    if (t === 1) return `We ${k.mech}, unlike ${rival}.`;
    return `Unlike ${rival}, we ${k.mech} using ${k.data}, instead of ${k.alt}; every ${k.unit} gets a plan built from their own data.`;
  })();

  const customer = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_CUSTOMER);
    if (t === 1) return k.customers;
    return `${k.customers} in ${city}`;
  })();
  const market = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_MARKET);
    if (t === 1) return `${k.customers} in ${city}`;
    return `${n * 10} ${k.customers} across ${city} and ${city2}`;
  })();
  const businessModel = pick(r, [
    "Subscription", "Freemium", "Marketplace", "Commission", "Pay-per-use", "One-time purchase", "Advertisement", "Other",
  ]);
  const revenue = (() => {
    const t = tierOf(q, r);
    if (t === 0) return pick(r, VAGUE_REVENUE);
    if (t === 1) return `${businessModel.toLowerCase()} from each ${k.unit}`;
    return `${businessModel.toLowerCase()}: ₹${price} per ${k.unit} per month, first ${n} paying customers from the pilot`;
  })();

  const optimism = gauss(r) * 8;
  const slider = () => clip(100 * (0.3 + 0.45 * q) + 14 + optimism + gauss(r) * 14, 5, 100);
  const nComp = Math.min(10, Math.max(0, Math.round(3.2 + (1 - q) * 2 + gauss(r) * 1.8)));
  const input: StartupInput = {
    startupName: name,
    description: desc,
    industry: k.industry,
    stage: pick(r, ["Idea", "Idea", "Prototype", "MVP", "Early Startup", "Growth"]),
    problemStatement: problem,
    targetCustomer: customer,
    problemFrequency: pick(r, ["Rare", "Occasional", "Frequent", "Frequent", "Very Frequent"]),
    problemSeverity: Math.round(slider()),
    targetMarket: market,
    geographicMarket: pick(r, ["Local", "Regional", "Regional", "National", "National", "Global"]),
    estimatedCustomers: r() < 0.25 ? null : Math.round(Math.exp(Math.log(100) + r() * Math.log(500000))),
    expectedPricing: r() < 0.3 + 0.5 * q ? price : null,
    demandPerception: Math.round(slider()),
    businessModel,
    revenueModel: revenue,
    competitors: Array.from({ length: nComp }, () => pick(r, RIVALS)),
    differentiator: diff,
    scalability: Math.round(slider()),
  };
  // Label = hidden quality plus noise, cut into the four classes.
  const Q = q + gauss(r) * 0.06;
  const label = Q >= 0.72 ? 3 : Q >= 0.5 ? 2 : Q >= 0.3 ? 1 : 0;
  return { input, quality: q, label };
}

export const SIM_FEATURE_ORDER: (keyof FeatureVector)[] = [
  "market_demand", "problem_fit", "innovation", "competition", "business_potential",
  "scalability", "customer_need", "risk", "competitor_count", "desc_specificity",
  "pricing_present", "differentiator_strength", "text_evidence", "self_rating_avg",
];

/** Simulated ideas run through the real feature extractor. Lazy import keeps the client bundle small. */
export async function simulatedRows(n: number, seed: number) {
  const { extractScores } = await import("./features.ts");
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const sim = simulateIdea(r);
    const { features, scores } = extractScores(sim.input);
    return { ...sim, features, scores };
  });
}

export async function simulatedDatasetCsv(n = 4000, seed = 42) {
  const rows = await simulatedRows(n, seed);
  const { weightedFinalScore } = await import("./scoring.ts");
  const { verdictFromScore } = await import("./config.ts");
  const names = ["Needs Major Improvement", "High Risk", "Promising", "Highly Promising"];
  // rules_score / rules_label are NOT model inputs: train.py only uses them to
  // report how often the forest and the rules agree on held-out rows.
  const header = [...SIM_FEATURE_ORDER, "quality", "label", "label_name", "rules_score", "rules_label"].join(",");
  const lines = rows.map((row) => {
    const rulesScore = weightedFinalScore(row.scores);
    return [
      ...SIM_FEATURE_ORDER.map((f) => Number(row.features[f]).toFixed(3)),
      row.quality.toFixed(4),
      row.label,
      names[row.label],
      rulesScore,
      names.indexOf(verdictFromScore(rulesScore)),
    ].join(",");
  });
  return `${header}\n${lines.join("\n")}\n`;
}
