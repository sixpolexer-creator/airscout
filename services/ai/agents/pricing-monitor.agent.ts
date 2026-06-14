/**
 * PricingMonitorAgent
 * Runs as a background agent inside the AI pipeline (Step 2).
 * Scope is strictly limited to international major hubs defined in
 * lib/major-hubs.ts — domestic or unknown codes are rejected at runtime.
 *
 * Designed to be called by:
 *   • The local AgentPipeline orchestrator (services/ai/pipeline.ts)
 *   • A CrewAI Task via process.stdout / JSON emission
 *   • An n8n "Execute Code" node via the same JSON contract
 *   • An MCP server tool call (see docker-compose.agents.yml)
 */

import { MAJOR_HUB_CODES, isMajorHub } from "@/lib/major-hubs";

// ── Types ────────────────────────────────────────────────────────────────────

export interface HubStatus {
  code: string;
  operational: boolean;
  alerts: string[];      // e.g. ["fog delay", "runway maintenance"]
  checkedAt: string;     // ISO 8601
}

export interface PriceTrend {
  route: string;          // "TLV→LHR"
  baselineUSD: number;    // rolling 30-day average stored in Redis
  currentUSD: number;     // latest sampled price
  deltaPercent: number;   // (current - baseline) / baseline * 100
  sampledAt: string;
}

export interface MonitorRecommendation {
  action: "promote" | "suppress" | "alert";
  reason: string;
  affectedRoutes: string[];
}

export interface PricingMonitorResult {
  agentId: string;
  runAt: string;
  hubStatuses: HubStatus[];
  priceTrends: PriceTrend[];
  recommendations: MonitorRecommendation[];
}

export interface AgentRunOptions {
  /** Restrict to a subset of MAJOR_HUB_CODES. Defaults to all 35 hubs. */
  hubs?: string[];
  /** Explicit route pairs to sample instead of the default hot-routes list. */
  priceSampleRoutes?: Array<{ origin: string; destination: string }>;
  timeoutMs?: number;
}

// ── Guard ────────────────────────────────────────────────────────────────────

function assertMajorHub(code: string): asserts code is string {
  if (!isMajorHub(code)) {
    throw new Error(
      `Scope violation: "${code}" is not an approved international hub. ` +
      `Only airports in MAJOR_HUB_CODES are permitted (e.g. TLV, LCA, LHR).`,
    );
  }
}

// ── Sub-tasks (swap with real API calls in production) ───────────────────────

async function fetchHubStatus(code: string): Promise<HubStatus> {
  assertMajorHub(code);
  // Production: GET https://aviation-status-api.example/v1/airports/{code}/status
  // Response shape matches HubStatus above.
  return {
    code,
    operational: true,
    alerts: [],
    checkedAt: new Date().toISOString(),
  };
}

async function sampleRoute(origin: string, destination: string): Promise<PriceTrend> {
  assertMajorHub(origin);
  assertMajorHub(destination);
  // Production: read baseline from Redis (TTL-keyed rolling average),
  // then call the active FlightAdapter for a live spot price.
  const baseline = 350 + Math.random() * 700;
  const current  = baseline * (0.82 + Math.random() * 0.36);
  return {
    route: `${origin}→${destination}`,
    baselineUSD:  Math.round(baseline),
    currentUSD:   Math.round(current),
    deltaPercent: Math.round(((current - baseline) / baseline) * 100),
    sampledAt:    new Date().toISOString(),
  };
}

// ── Recommendation logic ─────────────────────────────────────────────────────

function buildRecommendations(
  hubs: HubStatus[],
  trends: PriceTrend[],
): MonitorRecommendation[] {
  const recs: MonitorRecommendation[] = [];

  const disrupted = hubs.filter((h) => !h.operational || h.alerts.length > 0);
  if (disrupted.length > 0) {
    recs.push({
      action: "alert",
      reason: "Hub disruption detected — deprioritize affected routes in ranking.",
      affectedRoutes: disrupted.flatMap((h) =>
        trends.filter((t) => t.route.includes(h.code)).map((t) => t.route),
      ),
    });
  }

  const drops = trends.filter((t) => t.deltaPercent <= -10);
  if (drops.length > 0) {
    recs.push({
      action: "promote",
      reason: `Price drop ≥10% detected — surface in Best Value banner and deal feed.`,
      affectedRoutes: drops.map((t) => t.route),
    });
  }

  const spikes = trends.filter((t) => t.deltaPercent >= 25);
  if (spikes.length > 0) {
    recs.push({
      action: "suppress",
      reason: `Price spike ≥25% detected — suppress from Best Value banner.`,
      affectedRoutes: spikes.map((t) => t.route),
    });
  }

  return recs;
}

// ── Agent class ──────────────────────────────────────────────────────────────

export class PricingMonitorAgent {
  readonly agentId = "pricing-monitor-v1";

  async run(opts: AgentRunOptions = {}): Promise<PricingMonitorResult> {
    const hubs   = (opts.hubs ?? MAJOR_HUB_CODES).filter(isMajorHub);
    const routes = opts.priceSampleRoutes ?? DEFAULT_SAMPLE_ROUTES;

    const deadline = opts.timeoutMs
      ? new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("PricingMonitorAgent timed out")), opts.timeoutMs),
        )
      : null;

    const work = Promise.all([
      Promise.all(hubs.map(fetchHubStatus)),
      Promise.all(routes.map((r) => sampleRoute(r.origin, r.destination))),
    ]);

    const [hubStatuses, priceTrends] = deadline
      ? await Promise.race([work, deadline])
      : await work;

    return {
      agentId: this.agentId,
      runAt: new Date().toISOString(),
      hubStatuses,
      priceTrends,
      recommendations: buildRecommendations(hubStatuses, priceTrends),
    };
  }

  /** Emit result as a newline-delimited JSON string for CrewAI / n8n / MCP. */
  serialize(result: PricingMonitorResult): string {
    return JSON.stringify(result);
  }
}

// ── High-traffic seed routes (TLV + LCA prioritised per product requirement) ─

const DEFAULT_SAMPLE_ROUTES: Array<{ origin: string; destination: string }> = [
  { origin: "TLV", destination: "LHR" },
  { origin: "TLV", destination: "CDG" },
  { origin: "TLV", destination: "FRA" },
  { origin: "TLV", destination: "AMS" },
  { origin: "TLV", destination: "DXB" },
  { origin: "LCA", destination: "LHR" },
  { origin: "LCA", destination: "AMS" },
  { origin: "LCA", destination: "ATH" },
  { origin: "JFK", destination: "LHR" },
  { origin: "JFK", destination: "CDG" },
  { origin: "DXB", destination: "LHR" },
  { origin: "DOH", destination: "JFK" },
  { origin: "SIN", destination: "LHR" },
];

export const pricingMonitorAgent = new PricingMonitorAgent();
