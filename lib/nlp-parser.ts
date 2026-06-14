/**
 * NLP parser — converts raw natural-language flight queries into
 * structured SearchQuery payloads (Step 4).
 *
 * Uses Claude (claude-haiku-4-5) for low-latency extraction.
 * Falls back to a regex heuristic when ANTHROPIC_API_KEY is absent.
 *
 * Security notes:
 *   • User input is never interpolated into Cypher or SQL — it is passed
 *     as a plain string to the LLM and only the JSON output is used.
 *   • The LLM response is validated against ParsedSearchIntent before use.
 *   • Max input length is capped at 1 000 characters.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SearchQuery, CabinClass } from "@/lib/types";
import { isMajorHub } from "@/lib/major-hubs";

// ── Output schema ─────────────────────────────────────────────────────────────

export interface ParsedSearchIntent {
  origin?: string;          // IATA code or null
  destination?: string;     // IATA code or null
  departDate?: string;      // YYYY-MM-DD or null
  returnDate?: string;      // YYYY-MM-DD or null
  passengers: number;       // default 1
  cabin: CabinClass;        // default "economy"
  maxStops?: number;        // null = any
  includeNearby: boolean;
  confidence: number;       // 0–1 LLM self-reported confidence
  rawEntities: Record<string, string>; // debug: what the LLM extracted
}

// Maps to the existing SearchQuery used by the search API.
export function intentToSearchQuery(intent: ParsedSearchIntent): Partial<SearchQuery> {
  return {
    origin:        intent.origin,
    destination:   intent.destination,
    departDate:    intent.departDate,
    returnDate:    intent.returnDate,
    passengers:    intent.passengers,
    cabin:         intent.cabin,
    maxStops:      intent.maxStops,
    includeNearby: intent.includeNearby,
    flexDays:      0,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

const CABIN_VALUES: CabinClass[] = ["economy", "premium_economy", "business", "first"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INPUT_LEN = 1_000;

function sanitizeInput(raw: string): string {
  // Strip control characters, limit length.
  return raw.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, MAX_INPUT_LEN).trim();
}

function validateIntent(raw: unknown): ParsedSearchIntent {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("NLP parser returned non-object JSON.");
  }
  const r = raw as Record<string, unknown>;

  const passengers = typeof r.passengers === "number" && r.passengers > 0 ? r.passengers : 1;
  const cabin: CabinClass = CABIN_VALUES.includes(r.cabin as CabinClass)
    ? (r.cabin as CabinClass)
    : "economy";

  const origin      = typeof r.origin      === "string" && r.origin.length      === 3 ? r.origin.toUpperCase()      : undefined;
  const destination = typeof r.destination === "string" && r.destination.length === 3 ? r.destination.toUpperCase() : undefined;
  const departDate  = typeof r.departDate  === "string" && ISO_DATE.test(r.departDate)  ? r.departDate  : undefined;
  const returnDate  = typeof r.returnDate  === "string" && ISO_DATE.test(r.returnDate)  ? r.returnDate  : undefined;
  const maxStops    = typeof r.maxStops    === "number" && r.maxStops >= 0 ? Math.round(r.maxStops) : undefined;
  const confidence  = typeof r.confidence  === "number" ? Math.max(0, Math.min(1, r.confidence)) : 0.5;

  return {
    origin,
    destination,
    departDate,
    returnDate,
    passengers,
    cabin,
    maxStops,
    includeNearby: Boolean(r.includeNearby),
    confidence,
    rawEntities:   (typeof r.rawEntities === "object" && r.rawEntities !== null)
      ? (r.rawEntities as Record<string, string>)
      : {},
  };
}

// ── LLM extraction ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a flight-search intent extractor.
Given a user query, extract structured fields and return ONLY valid JSON matching this schema:

{
  "origin":        "<IATA 3-letter code or null>",
  "destination":   "<IATA 3-letter code or null>",
  "departDate":    "<YYYY-MM-DD or null>",
  "returnDate":    "<YYYY-MM-DD or null>",
  "passengers":    <integer, default 1>,
  "cabin":         "<economy|premium_economy|business|first>",
  "maxStops":      <integer or null>,
  "includeNearby": <boolean>,
  "confidence":    <0.0–1.0>,
  "rawEntities":   { "<entity>": "<extracted text>", ... }
}

Rules:
- Map airport/city names to IATA codes (e.g. "Larnaka International Airport" → "LCA", "Tel-Aviv Ben Gurion" → "TLV").
- If a field cannot be determined, use null.
- Do NOT include markdown fences or any text outside the JSON object.`;

const client = new Anthropic();

async function extractWithLLM(query: string): Promise<ParsedSearchIntent> {
  const msg = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: query }],
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const parsed = JSON.parse(text);
  return validateIntent(parsed);
}

// ── Regex heuristic fallback (no API key required) ────────────────────────────

const IATA_RE = /\b([A-Z]{3})\b/g;
const STOP_RE = /(\d+)\s*stop/i;
const DIRECT_RE = /\bnon[-\s]?stop\b|\bdirect\b/i;
const PAX_RE = /(\d+)\s*(passenger|person|adult|pax)/i;

function extractWithRegex(query: string): ParsedSearchIntent {
  const codes = Array.from(query.matchAll(IATA_RE))
    .map((m) => m[1])
    .filter(isMajorHub);

  const stopMatch   = STOP_RE.exec(query);
  const directMatch = DIRECT_RE.test(query);
  const paxMatch    = PAX_RE.exec(query);

  return {
    origin:        codes[0],
    destination:   codes[1],
    passengers:    paxMatch ? parseInt(paxMatch[1], 10) : 1,
    cabin:         /business/i.test(query) ? "business" : /first/i.test(query) ? "first" : "economy",
    maxStops:      directMatch ? 0 : stopMatch ? parseInt(stopMatch[1], 10) : undefined,
    includeNearby: /nearby|alternate/i.test(query),
    confidence:    0.4,
    rawEntities:   { rawText: query },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function parseNaturalLanguage(raw: string): Promise<ParsedSearchIntent> {
  const query = sanitizeInput(raw);

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await extractWithLLM(query);
    } catch {
      // LLM unavailable — fall through to heuristic so the API never hard-fails.
    }
  }

  return extractWithRegex(query);
}
