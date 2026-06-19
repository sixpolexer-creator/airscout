import type { FlightAdapter } from "@/lib/adapters/types";
import type { FeedEvent, FlightOffer, SearchQuery } from "@/lib/types";

export interface OrchestratorParams {
  adapters: FlightAdapter[];
  dateQueries: SearchQuery[];
  destinations: Array<{ code: string; km: number }>;
  baseQuery: SearchQuery;
  onEvent: (event: FeedEvent) => void;
}

interface Task {
  adapter: FlightAdapter;
  query: SearchQuery;
  destKm: number;
}

function buildTasks(params: OrchestratorParams): Task[] {
  const tasks: Task[] = [];
  for (const adapter of params.adapters) {
    for (const dateQuery of params.dateQueries) {
      for (const dest of params.destinations) {
        tasks.push({
          adapter,
          query: { ...dateQuery, destination: dest.code },
          destKm: dest.km,
        });
      }
    }
  }
  return tasks;
}

async function runTask(task: Task, onEvent: (event: FeedEvent) => void): Promise<FlightOffer[]> {
  const { adapter, query, destKm } = task;
  const at = Date.now();

  onEvent({ type: "status", phase: "fetch", detail: `${adapter.id} → ${query.destination} ${query.departDate}`, at });

  try {
    const offers = await adapter.search(query);
    const stamped = destKm > 0
      ? offers.map((o) => ({ ...o, nearbyKm: destKm }))
      : offers;

    onEvent({ type: "status", phase: "fetched", detail: `${adapter.id}: ${stamped.length} offers`, at: Date.now() });
    return stamped;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onEvent({ type: "status", phase: "fallback", detail: `${adapter.id} failed: ${message}`, at: Date.now() });
    return [];
  }
}

export async function fanOutSearch(params: OrchestratorParams): Promise<FlightOffer[]> {
  const tasks = buildTasks(params);
  if (tasks.length === 0) return [];

  const results = await Promise.allSettled(
    tasks.map((task) => runTask(task, params.onEvent)),
  );

  const offers: FlightOffer[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      offers.push(...result.value);
    }
  }
  return offers;
}
