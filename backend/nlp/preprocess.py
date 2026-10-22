"""Offline NLP helpers mirroring src/lib/engine/nlp.ts.

The production app runs tokenization and TF-IDF in TypeScript so the deployed
Node runtime has no Python dependency. This module exists for the training /
capstone documentation path and is a simplified mirror: the stopword list is a
small sample (the full English, Hindi, Marathi and romanized lists live in
nlp.ts), and Hindi/Marathi tokens are not stemmed, same as the app.
"""

from __future__ import annotations

import re
import unicodedata

STOPWORDS = {
    "a", "an", "the", "and", "or", "to", "of", "in", "for", "on", "with", "is",
    "are", "be", "as", "at", "by", "from", "that", "this", "it", "we", "you",
    # a few Hindi / Marathi / Hinglish examples
    "और", "का", "की", "के", "है", "में", "आणि", "आहे", "hai", "aur", "mein",
}

SHORT_KEEP = {"ai", "ml", "ar", "vr", "ev"}

STEM_RE = re.compile(r"(ing|tion|tions|ness|ment|ments|ers|ies|es|ed|ly|s)$", re.I)
LATIN_RE = re.compile(r"^[a-z0-9+]+$")


def _letters(token: str) -> int:
    return sum(1 for ch in token if unicodedata.category(ch).startswith("L"))


def _clean(text: str) -> str:
    # Keep letters, combining marks (Devanagari vowel signs), digits, whitespace and "+".
    # Python's \w would drop the combining marks, so check Unicode categories directly.
    return "".join(
        ch if (unicodedata.category(ch)[0] in "LMN" or ch.isspace() or ch == "+") else " "
        for ch in text
    )


def tokenize(text: str) -> list[str]:
    cleaned = unicodedata.normalize("NFC", text).lower().replace("\u200c", "").replace("\u200d", "")
    cleaned = _clean(cleaned)
    out: list[str] = []
    for raw in cleaned.split():
        if raw.isdigit() or raw in STOPWORDS:
            continue
        if LATIN_RE.match(raw):
            if len(raw) <= 2 and raw not in SHORT_KEEP:
                continue
            out.append(STEM_RE.sub("", raw) if len(raw) > 4 else raw)
        elif _letters(raw) >= 2:
            out.append(raw)
    return out
