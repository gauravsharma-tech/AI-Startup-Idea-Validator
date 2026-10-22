import type { KeywordHit } from "./types";

/**
 * Offline NLP for IdeaValidator: Unicode-aware tokenization (English, Hindi,
 * Marathi and romanized "Hinglish"), stopwords, light stemming, TF-IDF keywords
 * and the text-quality signals (specificity / concreteness / vagueness) the
 * scoring engine uses to decide how much to trust a founder's own claims.
 *
 * Known limits: Hindi/Marathi get stopword removal and signal terms but no
 * stemming (the suffix rules below only make sense for English), and the TF-IDF
 * corpus is English-only, so non-English keywords are ranked by frequency.
 */

/** Normalize a word list entry so Devanagari typed precomposed/decomposed matches. */
const norm = (s: string) => s.normalize("NFC").toLowerCase();
const words = (list: string) => list.split(/\s+/).filter(Boolean).map(norm);

const STOPWORDS_EN = words(
  `a about after against all also am an and any are as at be because been before being between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves onto via per within without across among`,
);

// Hindi (Devanagari) function words.
const STOPWORDS_HI = words(
  `और एवं तथा या कि की का के को से में पर है हैं था थे थी हो होता होती होते रहा रही रहे ही भी तो जो जब तब यह ये वह वे इस उस इन उन एक कुछ सभी बहुत लिए लिये साथ द्वारा बाद पहले वाले वाला वाली करना करने करते करता करती कर किया जाता जाती जाते सकता सकती सकते नहीं न अपने अपना अपनी हमारे हमारा हमारी उनके उनकी उसके उसकी जैसे क्योंकि लेकिन परंतु मगर अगर यदि तक कोई किसी क्या कौन कैसे कब कहाँ जहाँ यहाँ वहाँ इसलिए इसके इसकी ऐसे ऐसा ऐसी तरह अब फिर सिर्फ केवल बिना चाहिए चाहते चाहता पास दो हम आप मैं तुम वो उसे उन्हें इन्हें मुझे हमें आपको जिस जिन जिसमें जिसके जिनके इसमें उसमें इसे रहता रहती हुआ हुई हुए होना होने गया गई गए दिया दी दिए लेकर लेते लेता ले`,
);

// Marathi (Devanagari) function words.
const STOPWORDS_MR = words(
  `आणि व किंवा च ही हा हे ते तो ती त्या या ह्या आहे आहेत होते होता होती नाही नाहीत मध्ये साठी पासून कडे कडून वर खाली पण परंतु तर जर म्हणून असे असा अशी असून असतात असते करणे करतो करते करतात केले केला केली कोणत्या कोणी काय कसे कधी कुठे येथे तेथे सर्व काही अनेक खूप फक्त दोन आम्ही आपण तुम्ही मी तू मला आम्हाला त्यांना त्याचे त्याची त्याचा त्यांचे त्यांची आपले आपला आपली देखील सुद्धा तसेच जसे ज्या जे जो जी ज्यांना कमी शिवाय नंतर आधी बद्दल प्रमाणे पर्यंत होणे होऊ शकतो शकते शकतात लागते लागतो हवे पाहिजे येते येतात`,
);

// Romanized Hindi/Marathi ("Hinglish") function words, 3+ letters (shorter ones
// are dropped by the length rule anyway).
const STOPWORDS_ROMAN = words(
  `hai hain aur mein nahi nahin yeh woh bhi toh kyunki lekin agar kuch bahut liye saath wala wali wale karna karne karta karti karte kiya hota hoti hote raha rahi rahe hum hamare hamara hamari apne apna apni mujhe humein aap tum unke uske iske jaise taki phir sirf kaise kaun kahan jahan yahan wahan isliye jab sab par tak isme usme jiske jisme aani ahe nahi mhanun pan kay kase sarv`,
);

const STOPWORDS = new Set([
  ...STOPWORDS_EN,
  ...STOPWORDS_HI,
  ...STOPWORDS_MR,
  ...STOPWORDS_ROMAN,
]);

const INDUSTRY_TERMS = new Set([
  ...words(
    "education learning student classroom curriculum tutor exam finance bank payment credit loan insurance health clinic patient wellness hospital shop cart checkout retail inventory software platform cloud api workflow automate model neural prompt agent logistics fleet ride mobility food restaurant kitchen recipe climate carbon energy solar recycle streaming media content creator",
  ),
  ...words(
    "शिक्षा शिक्षण पढ़ाई परीक्षा बैंक भुगतान ऋण बीमा स्वास्थ्य आरोग्य अस्पताल क्लिनिक दुकान खुदरा सॉफ्टवेयर परिवहन भोजन रेस्टोरेंट जलवायु ऊर्जा सौर कृषि खेती शेती",
  ),
]);
const PROBLEM_TERMS = new Set([
  ...words(
    "problem pain friction waste delay expensive costly confusing difficult hard inefficient slow manual error mistake gap need struggle",
  ),
  ...words("समस्या परेशानी देरी महंगा महँगा कठिन धीमा नुकसान बर्बादी अव्यवस्था अडचण त्रास"),
]);
const CUSTOMER_TERMS = new Set([
  ...words(
    "student teacher parent professional founder owner patient shopper consumer user client business team school hospital farmer",
  ),
  ...words(
    "छात्र छात्रों विद्यार्थी विद्यार्थियों शिक्षक अभिभावक किसान किसानों शेतकरी दुकानदार दुकानदारों ग्राहक ग्राहकों उपभोक्ता मरीज मरीजों व्यवसाय कंपनी स्कूल कॉलेज परिवार महिला",
  ),
]);
const TECH_TERMS = new Set([
  ...words(
    "ai ml nlp llm algorithm model app mobile web api saas cloud automation analytics dashboard matching recommendation personalization",
  ),
  ...words("एआई ऐप एप्लिकेशन मोबाइल एल्गोरिदम ऑटोमेशन डैशबोर्ड"),
]);
const PRODUCT_TERMS = new Set([
  ...words(
    "planner marketplace delivery coach interview dashboard tracker subscription platform service tool product",
  ),
  ...words("बाज़ार बाजार मार्केटप्लेस प्लेटफॉर्म सेवा टूल प्लानर"),
]);

/**
 * Filler words that make a pitch sound like a pitch without saying anything
 * checkable. Entries are stemmed with the same rules as the text, so the match
 * is on the stemmed form.
 */
const GENERIC_RAW = [
  ...words(
    "everyone everybody everything everywhere anyone anything anywhere best better good great amazing awesome innovative revolutionary revolutionize unique solution platform people things stuff world disrupt disruptive seamless easy simple efficient smart modern advanced powerful powered users app application various many lot lots really improve improved improving help helps",
  ),
  ...words("सबके सबसे बेहतर अच्छा नया आसान स्मार्ट लोगों चीज़ें सर्वांसाठी सर्वोत्तम चांगले"),
  ...words("sabke sabko sabse behtar accha"),
];

/** Tiny built-in corpus so IDF is explainable and offline. */
const CORPUS: string[] = [
  "ai study planner helps college students organize coursework and exam revision with spaced repetition",
  "eco friendly delivery service reduces last mile carbon emissions for local retailers",
  "farmer marketplace connects local growers with nearby households and restaurants",
  "ai interview coach gives job seekers practice questions and feedback on answers",
  "fintech wallet for small businesses tracks invoices and payments",
  "health app reminds patients to take medication and book follow up visits",
  "saas analytics dashboard for ecommerce stores measures conversion and retention",
  "foodtech kitchen marketplace matches home cooks with nearby hungry customers",
  "climate carbon tracker helps companies measure and report emissions",
  "entertainment platform recommends short videos based on viewing history",
  "transportation carpool app matches commuters traveling similar routes",
  "edtech tutoring marketplace connects students with verified subject tutors",
];

/**
 * Two-letter Latin tokens that carry real meaning in startup text. The generic
 * "length > 2" filter would drop them, so TECH_TERMS entries such as "ai" and
 * "ml" could never match.
 */
const SHORT_KEEP = new Set(["ai", "ml", "ar", "vr", "ev"]);

const LATIN_TOKEN = /^[a-z0-9+]+$/;
const ONLY_DIGITS = /^\p{N}+$/u;
const LETTER = /\p{L}/u;

/** English-only suffix stripping; other scripts pass through unchanged. */
function stem(token: string) {
  if (!/^[a-z]+$/.test(token)) return token;
  if (token.length <= 4) return token;
  if (token === "business" || token === "businesses") return "business";
  if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
  if (token.endsWith("tion") && token.length > 7) return token.slice(0, -4);
  if (token.endsWith("ness") && token.length > 7) return token.slice(0, -4);
  if (token.endsWith("ment") && token.length > 7) return token.slice(0, -4);
  if (token.endsWith("ies") && token.length > 5) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("ly") && token.length > 5) return token.slice(0, -2);
  // "syllabus", "analysis", "business" keep their final s; plain plurals lose it.
  if (
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is") &&
    token.length > 4
  )
    return token.slice(0, -1);
  return token;
}

const GENERIC = new Set(GENERIC_RAW.map(stem));

function keepToken(t: string) {
  if (ONLY_DIGITS.test(t) || STOPWORDS.has(t)) return false;
  if (LATIN_TOKEN.test(t)) return t.length > 2 || SHORT_KEEP.has(t);
  // Other scripts: count letters, not code points, so "है" (1 letter + matra) is out.
  let letters = 0;
  for (const ch of t) if (LETTER.test(ch)) letters += 1;
  return letters >= 2;
}

export function tokenize(text: string): string[] {
  return (
    text
      .normalize("NFC")
      .toLowerCase()
      // ZWJ / ZWNJ sit inside Devanagari words; they are not separators.
      .replace(/[\u200c\u200d]/g, "")
      // Keep letters, combining marks (Devanagari vowel signs), digits and "+".
      .replace(/[^\p{L}\p{M}\p{N}\s+]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map(stem)
      .filter(keepToken)
  );
}

function termFreq(tokens: string[]) {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

const CORPUS_DFS: Map<string, number> = (() => {
  const df = new Map<string, number>();
  for (const doc of CORPUS) {
    const unique = new Set(tokenize(doc));
    for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return df;
})();

function categorize(term: string): KeywordHit["category"] {
  if (TECH_TERMS.has(term)) return "technology";
  if (INDUSTRY_TERMS.has(term)) return "industry";
  if (PROBLEM_TERMS.has(term)) return "problem";
  if (CUSTOMER_TERMS.has(term)) return "customer";
  if (PRODUCT_TERMS.has(term)) return "product";
  return "other";
}

export function analyzeText(texts: string[]) {
  const joined = texts.filter(Boolean).join(" ");
  const tokens = tokenize(joined);
  const tf = termFreq(tokens);
  const nDocs = CORPUS.length + 1;
  const scored: KeywordHit[] = [];

  for (const [term, count] of tf) {
    const df = (CORPUS_DFS.get(term) ?? 0) + 1;
    const idf = Math.log((nDocs + 1) / df) + 1;
    const tfNorm = count / Math.max(tokens.length, 1);
    scored.push({
      term,
      score: Number((tfNorm * idf * 100).toFixed(3)),
      category: categorize(term),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const keywords = scored.slice(0, 12);

  const uniqueTerms = new Set(tokens);
  const density = (set: Set<string>) =>
    tokens.filter((t) => set.has(t)).length / Math.max(tokens.length, 1);

  return {
    tokens,
    uniqueTerms: uniqueTerms.size,
    tokenCount: tokens.length,
    keywords,
    signals: {
      industry: density(INDUSTRY_TERMS),
      problem: density(PROBLEM_TERMS),
      customer: density(CUSTOMER_TERMS),
      technology: density(TECH_TERMS),
      product: density(PRODUCT_TERMS),
    },
  };
}

export function lexicalOverlap(a: string, b: string) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  return inter / Math.max(1, Math.min(sa.size, sb.size));
}

/** Words at which each free-text field counts as "fully described". */
export const FIELD_WORDS = {
  description: 45,
  problem: 28,
  differentiator: 22,
  customer: 6,
  market: 10,
  revenue: 12,
} as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Share of tokens that are pitch filler ("best", "everyone", "innovative"...). */
export function genericRatio(tokens: string[]) {
  if (tokens.length === 0) return 0;
  let g = 0;
  for (const t of tokens) if (GENERIC.has(t)) g += 1;
  // Floor the denominator so one filler word in a 4-word phrase is not "25% vague".
  return g / Math.max(tokens.length, 10);
}

const MECHANISM = new RegExp(
  [
    "\\b(by|using|through|instead of|rather than|unlike|because|so that|which|via|compared to|each|every|weekly|monthly|daily|within|only|per)\\b",
    "बजाय|क्योंकि|द्वारा|माध्यम से|प्रति|हर |रोज़|रोज|साप्ताहिक|मासिक|ऐवजी|कारण|दर ",
  ].join("|"),
  "giu",
);

/**
 * How checkable a text is: numbers and units, mechanism words ("by", "instead
 * of", "because"), and density of domain terms. 0–100.
 */
export function concretenessScore(text: string, tokens: string[] = tokenize(text)) {
  const numbers = (text.match(/\d+(?:[.,]\d+)?/g) ?? []).length;
  const mechanism = (text.match(MECHANISM) ?? []).length;
  let domain = 0;
  for (const t of tokens) {
    if (
      INDUSTRY_TERMS.has(t) ||
      PROBLEM_TERMS.has(t) ||
      CUSTOMER_TERMS.has(t) ||
      TECH_TERMS.has(t) ||
      PRODUCT_TERMS.has(t)
    )
      domain += 1;
  }
  const domainDensity = domain / Math.max(tokens.length, 8);
  return Math.min(100, 28 * Math.min(numbers, 2) + 18 * Math.min(mechanism, 3) + 110 * domainDensity);
}

/**
 * Text specificity, 0–100. Rewards a sensible length for the field
 * (`targetWords`), varied vocabulary, concrete detail, and penalizes filler.
 * Length alone can no longer reach a high score.
 */
export function specificityScore(text: string, targetWords = 45) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const tokens = tokenize(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const length = clamp01(wordCount / targetWords);
  const diversity = tokens.length ? (new Set(tokens).size / tokens.length) * 100 : 0;
  const concrete = concretenessScore(trimmed, tokens);
  const vague = genericRatio(tokens);
  const raw = 52 * length + 12 * (diversity / 100) * Math.sqrt(length) + 0.36 * concrete - 130 * vague;
  return Math.max(0, Math.min(100, raw));
}
