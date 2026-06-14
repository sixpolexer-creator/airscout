/**
 * HubValidatorAgent — Step 2.
 * Checks the operational status of a given set of international hubs
 * and returns enriched status records with alert severity classification.
 *
 * Scope: strictly limited to MAJOR_HUB_CODES (TLV, LCA, LHR, JFK, …).
 * Any code outside that list throws at the boundary check below.
 *
 * Wired into AgentPipeline as task type "hub-validator".
 * Also callable directly:
 *   const result = await hubValidatorAgent.run({ hubs: ["TLV", "LCA"] });
 */

import { MAJOR_HUB_CODES, isMajorHub } from "@/lib/major-hubs";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertSeverity = "none" | "advisory" | "warning" | "critical";

export interface HubAlert {
  code: string;           // IATA of affected hub
  severity: AlertSeverity;
  message: string;
  source: string;         // e.g. "NOTAM", "ATC", "weather"
  issuedAt: string;       // ISO 8601
  expiresAt?: string;
}

export interface ValidatedHub {
  code: string;
  name: string;           // resolved from airports.ts at runtime
  operational: boolean;   // false when severity = "critical"
  severity: AlertSeverity;
  alerts: HubAlert[];
  validatedAt: string;
}

export interface HubValidatorResult {
  agentId: string;
  runAt: string;
  hubs: ValidatedHub[];
  summary: {
    operational: number;
    advisory: number;
    warning: number;
    critical: number;
  };
}

export interface HubValidatorOptions {
  /** Subset of MAJOR_HUB_CODES to validate. Defaults to all 35 hubs. */
  hubs?: string[];
  timeoutMs?: number;
}

// ── Guard ─────────────────────────────────────────────────────────────────────

function assertMajorHub(code: string): void {
  if (!isMajorHub(code)) {
    throw new Error(
      `Scope violation: "${code}" is not an approved international hub. ` +
      `Only MAJOR_HUB_CODES are permitted (e.g. TLV, LCA, LHR, JFK).`,
    );
  }
}

// ── Status check (swap stub for real API in production) ───────────────────────

async function validateHub(code: string): Promise<ValidatedHub> {
  assertMajorHub(code);

  // Production: call AviationStack, FlightAware, or OurAirports NOTAM API.
  // Shape of API response should map to HubAlert[].
  // Example:
  //   GET https://api.aviationstack.com/v1/airports?iata_code={code}&access_key=...
  //   GET https://notams.aim.faa.gov/notamSearch/search?icaoId={icao}

  const alerts: HubAlert[] = []; // no live alerts in scaffold
  const severity: AlertSeverity = alerts.length === 0
    ? "none"
    : alerts.some((a) => a.severity === "critical")
      ? "critical"
      : alerts.some((a) => a.severity === "warning")
        ? "warning"
        : "advisory";

  return {
    code,
    name: code,                      // replace with airportByCode(code)?.name ?? code when wired
    operational: severity !== "critical",
    severity,
    alerts,
    validatedAt: new Date().toISOString(),
  };
}

// ── Agent class ───────────────────────────────────────────────────────────────

export class HubValidatorAgent {
  readonly agentId = "hub-validator-v1";

  async run(opts: HubValidatorOptions = {}): Promise<HubValidatorResult> {
    const targets = (opts.hubs ?? MAJOR_HUB_CODES).filter(isMajorHub);

    const work = Promise.all(targets.map(validateHub));
    const hubs = opts.timeoutMs
      ? await Promise.race([
          work,
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("HubValidatorAgent timed out")), opts.timeoutMs),
          ),
        ])
      : await work;

    const summary = {
      operational: hubs.filter((h) => h.operational).length,
      advisory:    hubs.filter((h) => h.severity === "advisory").length,
      warning:     hubs.filter((h) => h.severity === "warning").length,
      critical:    hubs.filter((h) => h.severity === "critical").length,
    };

    return { agentId: this.agentId, runAt: new Date().toISOString(), hubs, summary };
  }

  serialize(result: HubValidatorResult): string {
    return JSON.stringify(result);
  }
}

export const hubValidatorAgent = new HubValidatorAgent();
