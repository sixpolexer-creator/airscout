/**
 * POST /api/semantic-search — Step 4
 *
 * Accepts a raw natural-language string and returns a structured
 * SearchQuery payload ready for the /api/search endpoint.
 *
 * Request body:
 *   { "query": "Flights from Tel Aviv to Larnaka with no more than one stop" }
 *
 * Response (200):
 *   { "intent": ParsedSearchIntent, "searchQuery": Partial<SearchQuery> }
 *
 * Error (400):
 *   { "error": "..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { parseNaturalLanguage, intentToSearchQuery } from "@/lib/nlp-parser";

export const runtime = "nodejs"; // needs Anthropic SDK + crypto

const MAX_QUERY_LEN = 500;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).query !== "string"
  ) {
    return NextResponse.json(
      { error: 'Body must be { "query": "<string>" }.' },
      { status: 400 },
    );
  }

  const raw = ((body as Record<string, unknown>).query as string).trim();

  if (raw.length === 0) {
    return NextResponse.json({ error: "query must not be empty." }, { status: 400 });
  }
  if (raw.length > MAX_QUERY_LEN) {
    return NextResponse.json(
      { error: `query exceeds ${MAX_QUERY_LEN} character limit.` },
      { status: 400 },
    );
  }

  try {
    const intent = await parseNaturalLanguage(raw);
    const searchQuery = intentToSearchQuery(intent);

    return NextResponse.json(
      { intent, searchQuery },
      {
        status: 200,
        headers: {
          // Parsed intents are user-specific — never share across users.
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (err) {
    console.error("[semantic-search] parsing error:", err);
    return NextResponse.json(
      { error: "Failed to parse query. Please try again." },
      { status: 500 },
    );
  }
}
