"""Entity resolution & legal suffix normalization for company and license matching."""

from __future__ import annotations

import re

# Legal prefix/suffix tokens in Indonesian corporate structures
LEGAL_TERMS = [
    r"\bPT\b",
    r"\bTBK\b",
    r"\bCV\b",
    r"\bUD\b",
    r"\bNV\b",
    r"\bFIRMA\b",
    r"\bKOPERASI\b",
    r"\bPERSEROAN\s+TERBATAS\b",
    r"\bPERSERO\b",
    r"\bPERUSAHAAN\s+TERBATAS\b",
    r"\bHOLDINGS?\b",
    r"\bLIMITED\b",
    r"\bLTD\b",
    r"\bINC\b",
    r"\bCORP\b",
    r"\bCORPORATION\b",
    r"\bGROUP\b",
    r"\bINDONESIA\b",
    r"\bRESOURCES\b",
    r"\bMINING\b",
    r"\bMINERALS?\b",
    r"\bENERGY\b",
    r"\bENERGI\b",
    r"\bTAMBANG\b",
    r"\bBATUBARA\b",
    r"\bCOAL\b",
]

LEGAL_PATTERN = re.compile("|".join(LEGAL_TERMS), re.IGNORECASE)


def normalize_company_name(name: str | None) -> str:
    """Normalize legal company name for entity matching.

    Rules (§4.2 step 4a):
    1. Uppercase string
    2. Strip punctuation & special characters
    3. Remove legal prefixes/suffixes (PT, TBK, CV, PERSERO, etc.)
    4. Compact multiple whitespaces into a single space
    """
    if not name or not isinstance(name, str):
        return ""

    cleaned = name.upper()
    # Remove punctuation
    cleaned = re.sub(r"[\.,\(\)\[\]\/\-\\\'\"]+", " ", cleaned)
    # Remove legal prefix/suffix keywords
    cleaned = LEGAL_PATTERN.sub(" ", cleaned)
    # Collapse multiple whitespaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def generate_trigrams(text: str) -> set[str]:
    """Generate padded character trigrams for pg_trgm compatibility."""
    if not text:
        return set()
    # Padded with spaces front and back like PostgreSQL pg_trgm
    padded = f"  {text.lower()} "
    return {padded[i : i + 3] for i in range(len(padded) - 2)}


def calculate_trigram_similarity(name1: str, name2: str) -> float:
    """Compute trigram similarity (Dice coefficient) between two names."""
    norm1 = normalize_company_name(name1)
    norm2 = normalize_company_name(name2)

    if not norm1 or not norm2:
        return 0.0
    if norm1 == norm2:
        return 1.0

    tri1 = generate_trigrams(norm1)
    tri2 = generate_trigrams(norm2)

    if not tri1 or not tri2:
        return 0.0

    intersection = len(tri1 & tri2)
    total = len(tri1) + len(tri2)
    if total == 0:
        return 0.0
    return (2.0 * intersection) / total


def classify_match(score: float) -> tuple[str | None, float]:
    """Classify matching confidence according to spec §4.2 step 4c.

    - >= 0.72: method='fuzzy', headline metrics enabled
    - 0.55 - 0.72: method='fuzzy_low', displayed but excluded from headline metrics
    - < 0.55: unlinked (method=None, confidence=0.0)
    """
    if score >= 0.72:
        return "fuzzy", round(score, 4)
    elif score >= 0.55:
        return "fuzzy_low", round(score, 4)
    else:
        return None, 0.0


def find_best_company_match(
    license_company_name: str,
    company_lookup: dict[str, str],  # slug -> company_name
) -> tuple[str | None, float, str | None]:
    """Find the best matching company slug for a license company name.

    Returns (best_company_slug, match_confidence, match_method).
    """
    if not license_company_name:
        return None, 0.0, None

    norm_license = normalize_company_name(license_company_name)
    if not norm_license:
        return None, 0.0, None

    best_slug: str | None = None
    best_score = 0.0

    for slug, comp_name in company_lookup.items():
        norm_comp = normalize_company_name(comp_name)
        if norm_license == norm_comp:
            return slug, 1.0, "exact"

        score = calculate_trigram_similarity(license_company_name, comp_name)
        if score > best_score:
            best_score = score
            best_slug = slug

    method, conf = classify_match(best_score)
    if method is not None and best_slug is not None:
        return best_slug, conf, method
    return None, 0.0, None
