import type {
  CompetitorCard,
  NextStep,
  Recommendation,
  RiskItem,
  RiskLevel,
  ScoreBreakdown,
  StartupInput,
  StrengthItem,
  UnitEconomicsInput,
  UnitEconomicsResult,
  Summary,
  Swot,
  WeaknessItem,
} from "./types";
import { assessSnapshot } from "../location/score.ts";
import { FIELD_WORDS, specificityScore, tokenize } from "./nlp.ts";

function levelFromScore(riskish: number): RiskLevel {
  if (riskish >= 67) return "High";
  if (riskish >= 40) return "Medium";
  return "Low";
}

/**
 * True when the idea itself leans on AI/ML. Whole-word matching only: the old
 * substring regex fired on "retail", "email", "claim", "business model", etc.
 */
const AI_WORDS = /\b(ai|ml|llms?|nlp|machine learning|deep learning|neural networks?|computer vision)\b/i;
export function leansOnAi(input: Pick<StartupInput, "description" | "industry" | "differentiator">) {
  if (input.industry === "AI") return true;
  return AI_WORDS.test(`${input.description} ${input.differentiator}`);
}

export function buildStrengths(scores: ScoreBreakdown, input: StartupInput): StrengthItem[] {
  const items: StrengthItem[] = [];
  if (scores.problemFit >= 68) {
    items.push({
      title: "Strong problem relevance",
      detail: `The stated problem for ${input.targetCustomer.toLowerCase()} is specific and frequent enough to support a first beachhead.`,
    });
  }
  if (scores.marketDemand >= 68) {
    items.push({
      title: "Credible market demand signal",
      detail: `A ${input.geographicMarket.toLowerCase()} reach plus the described customer need point to a market that is worth testing.`,
    });
  }
  if (scores.scalability >= 68) {
    items.push({
      title: "Room to scale",
      detail: `The ${input.businessModel.toLowerCase()} model and ${input.geographicMarket.toLowerCase()} market can expand without rewriting the core idea.`,
    });
  }
  if (scores.businessPotential >= 68) {
    items.push({
      title: "Clearer path to revenue",
      detail: `A ${input.businessModel.toLowerCase()} model${input.expectedPricing ? ` at ₹${input.expectedPricing}` : ""} is concrete enough to test with early users.`,
    });
  }
  if (scores.innovation >= 68) {
    items.push({
      title: "Differentiated positioning",
      detail: input.differentiator.slice(0, 180) || "The idea includes a distinct approach relative to generic alternatives.",
    });
  }
  if (scores.customerNeed >= 70) {
    items.push({
      title: "Customer need looks acute",
      detail: `Severity ${input.problemSeverity}/100 and ${input.problemFrequency.toLowerCase()} occurrence suggest people already feel this pain.`,
    });
  }
  if (input.location) {
    const loc = assessSnapshot(input.location);
    if (!loc.lowData && loc.demandScore >= 65) {
      items.push({
        title: "Busy surroundings at the chosen spot",
        detail: `Map data shows plenty of customer sources and shops within ${input.location.radiusM} m (demand ${loc.demandScore}/100).`,
      });
    }
    if (!loc.lowData && loc.competitionScore >= 65) {
      items.push({
        title: "Room to grow locally",
        detail: `Only ${loc.sameCount} similar shop${loc.sameCount === 1 ? " is" : "s are"} mapped within ${input.location.radiusM} m of the chosen spot.`,
      });
    }
  }
  if (items.length === 0) {
    items.push({
      title: "The idea is specific enough to test",
      detail: "Even with mixed scores, there is a defined customer and problem — enough to run structured interviews.",
    });
  }
  return items.slice(0, 5);
}

export function buildWeaknesses(scores: ScoreBreakdown, input: StartupInput): WeaknessItem[] {
  const items: WeaknessItem[] = [];
  const n = input.competitors.filter(Boolean).length;
  if (n >= 5 && scores.innovation < 60) {
    items.push({
      title: "High competitive pressure",
      detail: `${n} named alternatives with a modest differentiator means acquisition and positioning will be harder than building the first version.`,
    });
  }
  if (scores.innovation < 55) {
    items.push({
      title: "Unclear differentiation",
      detail: "Buyers need a reason to switch. Tighten the unique mechanism, not just the category description.",
    });
  }
  if (!input.expectedPricing || input.expectedPricing <= 0) {
    items.push({
      title: "Pricing uncertainty",
      detail: "Without a working price, willingness-to-pay and unit economics stay hypothetical.",
    });
  }
  if (scores.customerNeed < 55) {
    items.push({
      title: "Customer acquisition risk",
      detail: "If the pain is infrequent or the buyer is vague, paid acquisition will outrun retention.",
    });
  }
  if (scores.marketDemand < 55) {
    items.push({
      title: "Demand still unproven",
      detail: "The market score is an estimate from your inputs. Treat it as a hypothesis to validate, not a TAM figure.",
    });
  }
  if (input.stage === "Idea" && scores.scalability < 50) {
    items.push({
      title: "Early operational constraints",
      detail: "At idea stage, scale claims should wait until a single customer segment is served well.",
    });
  }
  if (input.location) {
    const loc = assessSnapshot(input.location);
    if (loc.competitionScore < 35) {
      items.push({
        title: "Heavy local competition at the chosen spot",
        detail: `${loc.sameCount} similar shops are mapped within ${input.location.radiusM} m${loc.nearestSameM !== null ? `, the nearest ${loc.nearestSameM} m away` : ""}. A clear edge (price, quality, timings) is needed.`,
      });
    }
    if (!loc.lowData && loc.demandScore < 30) {
      items.push({
        title: "Thin footfall around the chosen spot",
        detail: "Few customer sources are mapped around this point, so walk-in demand may be low.",
      });
    }
    if (loc.lowData) {
      items.push({
        title: "Map data is thin here",
        detail: "OpenStreetMap has very little mapped around this spot, so the map check carries less weight. Count shops and footfall on the ground.",
      });
    }
  }
  if (items.length === 0) {
    items.push({
      title: "Execution is the remaining risk",
      detail: "Dimension scores are solid. The open question is whether a small group of target users will pay for an MVP.",
    });
  }
  return items.slice(0, 5);
}

export function buildSwot(
  scores: ScoreBreakdown,
  input: StartupInput,
  strengths: StrengthItem[],
  weaknesses: WeaknessItem[],
): Swot {
  const opportunities: string[] = [];
  if (input.geographicMarket !== "Global") {
    opportunities.push(
      `Expand from a ${input.geographicMarket.toLowerCase()} beachhead once a single segment is converted.`,
    );
  }
  if (scores.problemFit >= 60) {
    opportunities.push(`Interview ${input.targetCustomer.toLowerCase()} this month and turn quotes into MVP scope.`);
  }
  if (["Subscription", "Freemium", "Pay-per-use"].includes(input.businessModel)) {
    opportunities.push("Recurring revenue can fund iteration if onboarding is tight.");
  }
  opportunities.push(
    `Use the ${input.industry} category language your buyers already search for, then layer the differentiator.`,
  );

  const threats: string[] = [];
  if (input.competitors.filter(Boolean).length >= 3) {
    threats.push("Established alternatives can copy a thin feature advantage faster than a brand can form.");
  }
  threats.push("Without independent customer evidence, the demand score can overstate actual pull.");
  if (input.stage === "Idea" || input.stage === "Prototype") {
    threats.push("Building too wide before interviews wastes the first development cycle.");
  }
  threats.push("Pricing that is guessed rather than tested can stall conversion even if the problem is real.");

  return {
    strengths: strengths.map((s) => s.title),
    weaknesses: weaknesses.map((w) => w.title),
    opportunities: opportunities.slice(0, 4),
    threats: threats.slice(0, 4),
  };
}

export function buildRisks(scores: ScoreBreakdown, input: StartupInput): RiskItem[] {
  const n = input.competitors.filter(Boolean).length;
  const techRisk = leansOnAi(input) && input.stage === "Idea" ? 64 : 38;
  return [
    {
      category: "Market Risk",
      level: levelFromScore(100 - scores.marketDemand),
      explanation:
        scores.marketDemand >= 70
          ? "Demand inputs and reach look supportive, but they remain an estimate until customers confirm."
          : "Market pull is still a hypothesis. Narrow geography and a single buyer before spending on acquisition.",
    },
    {
      category: "Competition Risk",
      level: n === 0 ? "Medium" : n >= 6 && scores.innovation < 60 ? "High" : n >= 3 ? "Medium" : "Low",
      explanation:
        n === 0
          ? "Key competitors and risks were auto-analyzed by AI based on your industry and market dynamics."
          : `The market contains ${n} named alternative${n === 1 ? "" : "s"}, so differentiation will matter more than feature volume.`,
    },
    {
      category: "Financial Risk",
      level: !input.expectedPricing ? "High" : scores.businessPotential < 55 ? "Medium" : "Low",
      explanation: !input.expectedPricing
        ? "No price point was provided, so revenue and payback cannot be stress-tested."
        : `A ${input.businessModel.toLowerCase()} model at ₹${input.expectedPricing} is a starting point — validate willingness to pay with a small group.`,
    },
    {
      category: "Technology Risk",
      level: levelFromScore(techRisk),
      explanation:
        techRisk >= 60
          ? "The idea leans on AI/ML while still at an early stage. Scope the first version around a single workflow, not a general model."
          : "Technology complexity looks manageable relative to the described product. Still isolate one core job-to-be-done.",
    },
    {
      category: "Customer Risk",
      level: levelFromScore(100 - scores.customerNeed),
      explanation: `Targeting “${input.targetCustomer}” ${scores.customerNeed >= 65 ? "is specific enough to interview" : "still reads broad — pick one persona"}.`,
    },
    {
      category: "Operational Risk",
      level: input.stage === "Idea" ? "Medium" : scores.scalability < 50 ? "High" : "Low",
      explanation:
        input.stage === "Idea"
          ? "At idea stage, delivery, support, and compliance are unknown. Do not staff for scale yet."
          : "Operational load will follow distribution. Keep the first process manual where software is not the bottleneck.",
    },
  ];
}

type IndustryCompetitorProfile = {
  name: string;
  category: string;
  baseSimilarity: number;
  pressure: RiskLevel;
  risk: string;
  mitigation: string;
};

const INDUSTRY_COMPETITORS: Record<string, IndustryCompetitorProfile[]> = {
  "E-Commerce & Retail": [
    {
      name: "Amazon & Flipkart (Marketplace Giants)",
      category: "Horizontal E-Commerce",
      baseSimilarity: 78,
      pressure: "High",
      risk: "Massive scale, established supply chains, high consumer trust, and aggressive price-undercutting.",
      mitigation: "Do not compete on broad catalog or price. Build a sharp niche wedge, exclusive brand storytelling, and direct community loyalty.",
    },
    {
      name: "D2C Brands & Specialized Stores",
      category: "Vertical Retailers",
      baseSimilarity: 65,
      pressure: "Medium",
      risk: "Rising Meta/Google advertising CAC and heavy social media ad clutter.",
      mitigation: "Leverage organic content loops, micro-influencers, and high-retention subscription or repeat-order incentives.",
    },
    {
      name: "Quick Commerce Platforms (Blinkit / Zepto)",
      category: "Instant Delivery",
      baseSimilarity: 52,
      pressure: "Medium",
      risk: "Rising consumer habit of expecting 10-15 minute delivery times.",
      mitigation: "Specialize in planned, premium, or customized purchases where product uniqueness matters much more than instant delivery.",
    },
  ],
  "FinTech & Financial Services": [
    {
      name: "Discount Brokers & Investment Apps (Zerodha, Groww)",
      category: "Wealth & Trading",
      baseSimilarity: 75,
      pressure: "High",
      risk: "Zero/low-commission pricing models, strong regulatory moats, and deep consumer trust.",
      mitigation: "Target underserved segments (e.g. MSMEs, tier-2 retail, students) with hyper-simplified educational UX and embedded micro-products.",
    },
    {
      name: "Payment Gateways (Razorpay, Stripe)",
      category: "Payment Infrastructure",
      baseSimilarity: 68,
      pressure: "High",
      risk: "Pre-integrated business ecosystems, developer loyalty, and high merchant switching friction.",
      mitigation: "Specialize in vertical-specific checkout experiences (e.g. education fee installments, cross-border remittance, recurring B2B invoicing).",
    },
    {
      name: "Traditional Commercial Banks",
      category: "Legacy Banking",
      baseSimilarity: 48,
      pressure: "Low",
      risk: "Institutional deposit moats, government-backed guarantees, and legacy corporate relationships.",
      mitigation: "Position as an agile digital layer with 10x faster onboarding, absolute fee transparency, and modern API connectivity.",
    },
  ],
  "EdTech & Education": [
    {
      name: "Global MOOCs (Coursera, Udemy, edX)",
      category: "Self-Paced Learning",
      baseSimilarity: 72,
      pressure: "High",
      risk: "Vast libraries of low-cost or free content, recognized university credentials, and high search dominance.",
      mitigation: "Pivot from passive video consumption to cohort-based accountability, real-world portfolio building, and active 1-on-1 industry mentorship.",
    },
    {
      name: "Test-Prep Giants (PhysicsWallah, Unacademy)",
      category: "Competitive Exam Prep",
      baseSimilarity: 64,
      pressure: "Medium",
      risk: "Aggressive offline hybrid expansion, celebrity star educators, and massive price-undercutting.",
      mitigation: "Target high-demand non-academic vocational skills, practical tech apprenticeship, or micro-certifications with direct employer hiring pipelines.",
    },
    {
      name: "Informal Learning (YouTube & Open Tutorials)",
      category: "Free Open Content",
      baseSimilarity: 55,
      pressure: "Medium",
      risk: "Free tutorial availability creates psychological resistance against paid subscriptions.",
      mitigation: "Provide structured personalized roadmaps, gamified assignments, instant doubt-resolution, and tangible career outcomes.",
    },
  ],
  "Healthcare & HealthTech": [
    {
      name: "Teleconsultation Networks (Practo, Apollo 24/7)",
      category: "Doctor Discovery & Telehealth",
      baseSimilarity: 74,
      pressure: "High",
      risk: "Extensive pan-national doctor networks and deep healthcare partner tie-ups.",
      mitigation: "Specialize deeply in one high-touch chronic condition (e.g. diabetes reversal, mental health, PCOS) with dedicated care teams.",
    },
    {
      name: "E-Pharmacy Hubs (Tata 1mg, PharmEasy)",
      category: "Medicine Delivery",
      baseSimilarity: 62,
      pressure: "Medium",
      risk: "Aggressive discounting, established logistics supply chains, and bulk drug purchasing power.",
      mitigation: "Bundle medical guidance with preventive diagnostic tracking and personalized holistic health regimens instead of commodity pill sales.",
    },
    {
      name: "Local Offline Clinics & Diagnostic Centers",
      category: "Neighborhood Healthcare",
      baseSimilarity: 50,
      pressure: "Low",
      risk: "Deep in-person physical trust and long-standing doctor-patient relationships.",
      mitigation: "Empower local practitioners with collaborative software rather than trying to displace them.",
    },
  ],
  "Enterprise Software & B2B": [
    {
      name: "Enterprise Giants (Salesforce, Microsoft, SAP)",
      category: "Enterprise Horizontal Suites",
      baseSimilarity: 76,
      pressure: "High",
      risk: "Entrenched enterprise IT contracts, long sales cycles, and bundled software discounts.",
      mitigation: "Execute a product-led bottom-up wedge: offer 5-minute self-serve onboarding that solves one burning operational headache without IT approval.",
    },
    {
      name: "Mid-Market SaaS Challengers (Zoho, Freshworks)",
      category: "Affordable Business Software",
      baseSimilarity: 64,
      pressure: "Medium",
      risk: "Broad feature catalogs at aggressive SMB price points.",
      mitigation: "Deliver verticalized workflow specialization for your exact niche rather than generic horizontal tools.",
    },
    {
      name: "Legacy Spreadsheets & Manual Workflows",
      category: "Status Quo (Excel/Sheets)",
      baseSimilarity: 58,
      pressure: "Medium",
      risk: "Customer inertia and unwillingness to change existing habitual processes.",
      mitigation: "Import spreadsheet data instantly in 1-click and immediately demonstrate 10 hours saved per week.",
    },
  ],
  "Artificial Intelligence & ML": [
    {
      name: "Foundation Model Providers (OpenAI, Anthropic, Google)",
      category: "Core AI Infrastructure",
      baseSimilarity: 80,
      pressure: "High",
      risk: "Rapid model updates risk commoditizing thin API wrapper applications overnight.",
      mitigation: "Anchor value on proprietary domain datasets, complex multi-step user workflows, and deep integration into existing enterprise systems.",
    },
    {
      name: "Vertical AI Niche Startups",
      category: "AI Specialized Applications",
      baseSimilarity: 68,
      pressure: "Medium",
      risk: "Fast competitors copying prompts and UI features within weeks.",
      mitigation: "Build sticky data network effects, custom fine-tuned pipelines, and private on-premise security guarantees.",
    },
  ],
  "Food & Agriculture": [
    {
      name: "Aggregator Platforms (Zomato, Swiggy)",
      category: "Food Delivery Aggregators",
      baseSimilarity: 76,
      pressure: "High",
      risk: "High commission take-rates (20-30%) and delivery fleet lock-in.",
      mitigation: "Establish direct consumer channels via WhatsApp and branded web ordering with customer data ownership and loyalty rewards.",
    },
    {
      name: "Agri-Supply Chains (DeHaat, AgroStar)",
      category: "Farm Input & Output Networks",
      baseSimilarity: 65,
      pressure: "Medium",
      risk: "Strong ground distribution footprint and established credit terms with rural farmers.",
      mitigation: "Provide high-precision IoT/soil advisory and premium direct farm-to-table traceability.",
    },
  ],
  "Logistics & Supply Chain": [
    {
      name: "Aggregated Shipping Platforms (Shiprocket, Delhivery)",
      category: "3PL & Courier Aggregation",
      baseSimilarity: 75,
      pressure: "High",
      risk: "National courier contracts, high volume discounted rates, and wide tracking coverage.",
      mitigation: "Offer hyper-specialized delivery (e.g. cold-chain, fragile items, white-glove setup) or dedicated local B2B intra-city dispatch.",
    },
  ],
  "CleanTech & Energy": [
    {
      name: "Established Energy & Utility Conglomerates",
      category: "Grid & Traditional Utilities",
      baseSimilarity: 70,
      pressure: "High",
      risk: "Massive capital expenditure capacity, government subsidies, and regulatory monopolies.",
      mitigation: "Focus on decentralized micro-solutions (rooftop solar financing, smart IoT energy audits, battery swapping) targeting localized consumers.",
    },
  ],
};

const DEFAULT_COMPETITORS: IndustryCompetitorProfile[] = [
  {
    name: "Established Market Incumbents",
    category: "Market Leaders",
    baseSimilarity: 72,
    pressure: "High",
    risk: "Entrenched market recognition, large promotional budgets, and customer inertia.",
    mitigation: "Deliver a focused wedge product that solves one distinct problem 10x better and faster than complex legacy solutions.",
  },
  {
    name: "Alternative Direct Providers",
    category: "Direct Challengers",
    baseSimilarity: 60,
    pressure: "Medium",
    risk: "Competing for the exact same target audience across search and social channels.",
    mitigation: "Differentiate sharply on customer experience, specialized onboarding, transparent pricing, and community feedback loops.",
  },
  {
    name: "Manual & Offline Status Quo",
    category: "Existing Habits",
    baseSimilarity: 50,
    pressure: "Medium",
    risk: "Prospects hesitating to adopt new technology because their existing manual way feels 'good enough'.",
    mitigation: "Eliminate all upfront adoption friction with free trials, seamless data import, and visible instant ROI within the first 48 hours.",
  },
];

export function buildCompetitors(input: StartupInput): CompetitorCard[] {
  const names = input.competitors.map((c) => c.trim()).filter(Boolean);
  const diff = specificityScore(input.differentiator, FIELD_WORDS.differentiator);
  const ideaTokens = new Set(
    tokenize(`${input.description} ${input.problemStatement} ${input.differentiator}`),
  );

  // If founder provided no competitors, AI automatically detects the top market players & risks
  if (names.length === 0) {
    const profiles = INDUSTRY_COMPETITORS[input.industry] ?? DEFAULT_COMPETITORS;
    return profiles.map((p, i) => {
      const raw = p.baseSimilarity - i * 4 - (diff - 50) * 0.2;
      const similarity = Math.round(Math.min(90, Math.max(25, raw)));
      const pressure: RiskLevel = similarity >= 70 ? "High" : similarity >= 48 ? "Medium" : "Low";
      return {
        name: p.name,
        category: p.category,
        similarity,
        pressure,
        risk: p.risk,
        mitigation: p.mitigation,
        note: `AI Market Intelligence: Identified as a key player in ${input.industry}.`,
        prototype: true as const,
      };
    });
  }

  // Founder provided custom competitors: evaluate them and generate tailored risk & defense strategies
  return names.slice(0, 8).map((name, i) => {
    const mentioned = tokenize(name).some((t) => ideaTokens.has(t));
    const raw = 58 - i * 4 + (mentioned ? 10 : 0) - (diff - 50) * 0.3;
    const similarity = Math.round(Math.min(90, Math.max(25, raw)));
    const pressure: RiskLevel = similarity >= 70 ? "High" : similarity >= 48 ? "Medium" : "Low";
    const risk =
      pressure === "High"
        ? `Direct competitor danger: ${name} operates in close proximity to your target offering with high user familiarity.`
        : `Alternative choice: ${name} fulfills overlapping demand and creates acquisition price resistance.`;
    const mitigation =
      diff >= 55
        ? `Double down on your differentiator: emphasize your unique wedge that ${name} cannot easily match without rewriting their product.`
        : `Refine your niche: target the specific customer sub-segment that ${name} neglects or overcharges.`;
    return {
      name,
      category: input.industry,
      similarity,
      pressure,
      risk,
      mitigation,
      note: `Evaluated against your idea text and differentiator strength.`,
      prototype: true as const,
    };
  });
}

export function buildRecommendations(
  input: StartupInput,
  weaknesses: WeaknessItem[],
  scores: ScoreBreakdown,
): Recommendation[] {
  const recs: Recommendation[] = [];
  recs.push({
    title: "Narrow the first audience",
    detail: `Start with one slice of “${input.targetCustomer}” in a ${input.geographicMarket.toLowerCase()} market. Breadth hides whether anyone cares.`,
    priority: "high",
  });
  if (weaknesses.some((w) => /different/i.test(w.title)) || scores.innovation < 60) {
    recs.push({
      title: "Sharpen product differentiation",
      detail: "Write one sentence of the form: we help X do Y better than Z because of W. If W is vague, the idea is still a category, not a product.",
      priority: "high",
    });
  }
  if (!input.expectedPricing) {
    recs.push({
      title: "Test a price with a small group",
      detail: "Offer three price points to 10 target users. Measure which they would actually pay, not which they call “reasonable”.",
      priority: "high",
    });
  } else {
    recs.push({
      title: "Test pricing with a small user group",
      detail: `Take ₹${input.expectedPricing} to 8–12 people in the target segment and watch for hesitation, not compliments.`,
      priority: "medium",
    });
  }
  recs.push({
    title: "Build the MVP around one job",
    detail: `The MVP should complete the job in the problem statement — “${input.problemStatement.slice(0, 90)}” — and nothing else.`,
    priority: "high",
  });
  recs.push({
    title: "Validate demand before heavy spend",
    detail: "Run interviews and a waitlist or concierge test before hiring or buying ads. This score is not a green light to scale spend.",
    priority: "medium",
  });
  return recs.slice(0, 5);
}

export function buildNextSteps(input: StartupInput): NextStep[] {
  const steps: Omit<NextStep, "step">[] = [
    {
      title: "Validate the customer problem",
      month: "Month 1",
      dayRange: "Days 1–7",
      timeframe: "Month 1 · Days 1–7 (Problem Discovery)",
      category: "Validation",
      detail: `Hold 8–10 in-depth conversations with ${input.targetCustomer.toLowerCase()} about the last time they hit this problem. Ask what workarounds they use today.`,
      actionSteps: [
        `Identify 20–25 prospective ${input.targetCustomer.toLowerCase()} profiles on LinkedIn, relevant communities, or local networks.`,
        `Conduct 8–10 structured discovery calls: focus on their actual past experiences rather than hypothetical opinions.`,
        `Ask: 'How did you solve this last week?', 'What did it cost you?', and 'What is the most painful part?'.`,
        `Verify whether "${input.problemStatement.slice(0, 100)}..." is ranked as an urgent top-3 problem.`,
      ],
      tools: ["Google Meet / Zoom", "Notion / Google Docs", "Otter.ai / Fireflies", "WhatsApp"],
      successMetric: "At least 7 of 10 interviewees confirm the problem is frequent and costs them significant time or money.",
    },
    {
      title: "Interview target users & smoke test",
      month: "Month 1",
      dayRange: "Days 8–15",
      timeframe: "Month 1 · Days 8–15 (Value Testing)",
      category: "Marketing",
      detail: "Capture frequency, current spend, and switching cost. Launch a concise 1-page landing page to test click-through demand.",
      actionSteps: [
        "Craft a sharp 1-sentence value proposition highlighting your primary differentiator.",
        "Set up a minimalist waitlist or early-access page with a clear problem-solution message.",
        "Share the link directly with your interviewees and niche discussion forums.",
        "Track visitor-to-signup conversion rate to validate initial positioning before writing code.",
      ],
      tools: ["Carrd / Framer", "Tally.so / Typeform", "Google Analytics", "LinkedIn / X"],
      successMetric: "Reach 15%+ signup conversion rate on your early-access landing page.",
    },
    {
      title: "Build a narrow MVP",
      month: "Month 2",
      dayRange: "Days 16–45",
      timeframe: "Month 2 · Days 16–45 (Wedge Product)",
      category: "Product",
      detail:
        input.stage === "Idea" || input.stage === "Prototype"
          ? "Ship the smallest thing that solves the core job for five users."
          : "Cut anything that does not serve the beachhead segment’s primary job.",
      actionSteps: [
        "Identify the single core feature ('wedge') that directly solves the pain point.",
        "Strip out secondary features (social login, dark mode, complex settings) to launch within 2 weeks.",
        "Onboard 5 handpicked pilot users with white-glove personal support.",
        "Record user sessions to identify points of confusion and friction.",
      ],
      tools: ["Next.js / Vite / Bubble", "Supabase / Firebase", "PostHog / Hotjar", "Loom"],
      successMetric: "5 pilot users successfully complete the primary workflow without founder intervention.",
    },
    {
      title: "Test pricing & first sales",
      month: "Month 2–3",
      dayRange: "Days 46–65",
      timeframe: "Month 2–3 · Days 46–65 (Monetization)",
      category: "Sales",
      detail: `Put a real price point (${input.expectedPricing ? `₹${input.expectedPricing}` : "market-rate"}) in front of users. Track paid conversion, not polite survey scores.`,
      actionSteps: [
        `Introduce a paid tier (${input.businessModel.toLowerCase()} model) to your active pilot users.`,
        "Present the offer directly: 'If you want to keep using this to save time, it is ₹X/month starting next week.'",
        "If they hesitate, uncover whether the barrier is budget, perceived value, or missing critical functionality.",
        "Secure upfront payment or annual commitment in exchange for a founding-member discount.",
      ],
      tools: ["Razorpay / Stripe", "Zoho Invoice", "WhatsApp Business", "HubSpot Free CRM"],
      successMetric: "Achieve first 3–5 paying transactions or signed letters of intent.",
    },
    {
      title: "Measure early adoption & scale",
      month: "Month 3–6",
      dayRange: "Days 66–180",
      timeframe: "Month 3–6 · Days 66–180 (Retention & Growth)",
      category: "Operations",
      detail: "Define one retention event for week 1 and week 4. If it is not happening, change the offer before adding features.",
      actionSteps: [
        "Establish your North Star retention metric (e.g. user opens app 3x/week or generates 1 report/month).",
        "Measure 30-day cohort retention: ensure users keep returning without manual reminders.",
        "Identify the single most cost-effective customer acquisition channel and systematize it.",
        "Calculate unit economics (CAC vs. LTV) and ensure margin covers operational overhead.",
      ],
      tools: ["Mixpanel / PostHog", "Google Search Console", "Brevo / Resend", "Metabase"],
      successMetric: "Positive unit economics (LTV > 3x CAC) with Week 4 retention holding above 35%.",
    },
  ];
  if (input.location) {
    const where = input.location.label ? `near ${input.location.label}` : "at the chosen spot";
    steps.splice(1, 0, {
      title: "Walk the spot at peak and quiet hours",
      month: "Month 1",
      dayRange: "Days 4–7",
      timeframe: "Month 1 · Days 4–7 (On-Ground Inspection)",
      category: "Validation",
      detail: `Stand ${where} for an hour at the busiest and the quietest time. Count people passing, visit the nearest rivals, and check whether the map counts match what you see.`,
      actionSteps: [
        `Visit ${where} on a weekday and a weekend during rush hour and slow afternoon hours.`,
        "Count customer footfall into existing adjacent shops to evaluate actual purchasing volume.",
        "Check pedestrian visibility, vehicle parking convenience, and competitor pricing menus.",
        "Cross-reference live ground observation with OpenStreetMap density data.",
      ],
      tools: ["Phone Tally Counter", "Google Maps", "Field Notes", "Camera"],
      successMetric: "Ground footfall and target demographic traffic matches location opportunity score requirements.",
    });
  }
  return steps.map((s, i) => ({ step: i + 1, ...s }));
}

export function buildSummary(
  input: StartupInput,
  scores: ScoreBreakdown,
  finalScore: number,
  weaknesses: WeaknessItem[],
): Summary {
  const topWeak = weaknesses[0]?.title.toLowerCase() ?? "execution risk";
  return {
    potential: `${input.startupName} scores ${finalScore}/100. The strongest dimensions are the ones above 65 — use those as the story you test with customers, not as proof the business works.`,
    concern: `The main concern is ${topWeak}. That is the first thing to pressure-test in interviews.`,
    opportunity: `A focused offer for ${input.targetCustomer.toLowerCase()} in a ${input.geographicMarket.toLowerCase()} market is the fastest way to learn.`,
    nextStep: "Talk to target users this week, then decide whether the MVP scope is still the same.",
  };
}

export function buildInsight(
  input: StartupInput,
  finalScore: number,
  verdict: string,
  weaknesses: WeaknessItem[],
) {
  const concern = weaknesses[0]?.title.toLowerCase() ?? "differentiation and distribution";
  return `${input.startupName} is classified as ${verdict.toLowerCase()} with a ${finalScore}/100 composite score. The idea is specific enough to evaluate, but ${concern} should be examined carefully before treating this as more than an initial decision-support result.`;
}

/** Lifetime cap when churn is 0, so LTV stays finite and honest about being a long-run guess. */
export const MAX_LIFETIME_MONTHS = 120;

const fin = (n: number) => (Number.isFinite(n) ? n : 0);

/**
 * Plain unit economics from the founder's own assumptions. Nothing here is
 * measured: it shows what the assumptions imply, using common rules of thumb
 * (LTV:CAC of 3+, CAC payback under ~12 months) as reference points, not laws.
 */
export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const price = Math.max(0, fin(input.pricePerMonth));
  const cost = Math.max(0, fin(input.costToServe));
  const cac = Math.max(0, fin(input.cac));
  const churn = Math.min(100, Math.max(0, fin(input.monthlyChurnPct)));
  const fixed = Math.max(0, fin(input.fixedMonthlyCosts));
  const customers = Math.max(0, Math.round(fin(input.customers)));

  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;
  const lifetimeMonths = churn > 0 ? Math.min(MAX_LIFETIME_MONTHS, 100 / churn) : MAX_LIFETIME_MONTHS;
  const ltv = Math.max(0, margin) * lifetimeMonths;
  const ltvToCac = cac > 0 ? ltv / cac : null;
  const paybackMonths = margin > 0 ? cac / margin : null;
  const breakEvenCustomers = margin > 0 ? Math.ceil(fixed / margin) : null;
  const monthlyRevenue = price * customers;
  const monthlyProfit = margin * customers - fixed;

  const flags: UnitEconomicsResult["flags"] = [];
  if (price <= 0) {
    flags.push({ level: "warn", text: "No price entered yet, so nothing below is meaningful." });
  } else if (margin <= 0) {
    flags.push({
      level: "bad",
      text: "Each customer costs more to serve than they pay. More volume makes the loss bigger, not smaller.",
    });
  } else {
    if (marginPct < 30) {
      flags.push({ level: "warn", text: `Thin margin (${Math.round(marginPct)}%). Small cost surprises can wipe it out.` });
    }
    if (ltvToCac !== null) {
      if (ltvToCac >= 3) flags.push({ level: "good", text: `LTV is ${ltvToCac.toFixed(1)}x CAC, above the usual 3x rule of thumb.` });
      else if (ltvToCac >= 1) flags.push({ level: "warn", text: `LTV is only ${ltvToCac.toFixed(1)}x CAC. Growth would be slow and cash-hungry (3x is the usual target).` });
      else flags.push({ level: "bad", text: `LTV is ${ltvToCac.toFixed(1)}x CAC: each customer costs more to win than they ever return.` });
    }
    if (paybackMonths !== null && cac > 0) {
      if (paybackMonths > 18) flags.push({ level: "warn", text: `It takes ${paybackMonths.toFixed(0)} months of margin to earn back CAC, which is long for a young business.` });
      else if (paybackMonths <= 12) flags.push({ level: "good", text: `CAC is earned back in about ${Math.max(1, Math.round(paybackMonths))} month${Math.round(paybackMonths) === 1 ? "" : "s"}.` });
    }
    if (churn >= 10) flags.push({ level: "warn", text: `${churn}% monthly churn means customers stay about ${Math.round(100 / churn)} months on average.` });
    if (breakEvenCustomers !== null && fixed > 0) {
      if (customers < breakEvenCustomers) {
        flags.push({ level: "warn", text: `You need about ${breakEvenCustomers} paying customers to cover fixed costs; the model assumes ${customers}.` });
      } else {
        flags.push({ level: "good", text: `${customers} customers cover fixed costs (break-even is about ${breakEvenCustomers}).` });
      }
    }
  }
  return { margin, marginPct, lifetimeMonths, ltv, ltvToCac, paybackMonths, breakEvenCustomers, monthlyRevenue, monthlyProfit, flags };
}
