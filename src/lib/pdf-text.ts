/**
 * jsPDF's built-in fonts (Helvetica etc.) only cover the WinAnsi (Windows-1252)
 * character set. Anything outside it — notably the rupee sign ₹ — is drawn as
 * garbage. This makes text safe for those fonts without shipping a font file.
 *
 * Known limit: Devanagari and other scripts cannot be drawn with the built-in
 * fonts; they become "?". Embedding a Unicode TTF (e.g. Noto Sans) is the fix
 * if the PDF must show Hindi/Marathi text.
 */

// Characters in WinAnsi that live above U+00FF.
const WIN_ANSI_EXTRA = new Set(
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ".split(""),
);

const REPLACEMENTS: [RegExp, string][] = [
  [/₹\s*/g, "Rs. "],
  [/→/g, "->"],
  [/←/g, "<-"],
  [/≥/g, ">="],
  [/≤/g, "<="],
  [/[\u200B-\u200D\uFEFF]/g, ""],
  [/\t/g, " "],
];

export function pdfSafe(input: unknown): string {
  let text = typeof input === "string" ? input : input == null ? "" : String(input);
  for (const [pattern, to] of REPLACEMENTS) text = text.replace(pattern, to);
  let out = "";
  let lastWasUnknown = false;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = (code < 0x20 && ch !== "\n") || (code >= 0x7f && code < 0xa0);
    if (isControl) continue; // drop silently, never show as "?"
    if (code <= 0xff || WIN_ANSI_EXTRA.has(ch)) {
      out += ch;
      lastWasUnknown = false;
    } else if (!lastWasUnknown) {
      // One "?" per unsupported run, so a Hindi word is not "??????".
      out += "?";
      lastWasUnknown = true;
    }
  }
  return out;
}

/** Safe, non-empty file name stem for a startup name. */
export function pdfFileStem(name: string): string {
  const stem = name
    .normalize("NFKD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return stem || "startup";
}
