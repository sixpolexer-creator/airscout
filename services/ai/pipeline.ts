/**
 * AgentPipeline — multi-agent orchestrator (Step 2).
 *
 * Dispatch modes:
 *   "local"   — run agents in-process (dev / unit tests)
 *   "n8n"     — POST task payload to N8N_WEBHOOK_URL; n8n routes to nodes
 *   "mcp"     — send JSON-RPC 2.0 "tools/call" to a local MCP server (Docker)
 *
 * Extend by registering additional AgentTask handlers in AGENT_REGISTRY.
 */

import type { PricingMonitorResult, AgentRunOptions } from "./agents/pricing-monitor.agent";

// ── Task contract ─────────────────────────────────────────────────────────────

export type AgentTaskType = "pricing-monitor" | "hub-validator" | "cache-refresh";

export interface AgentTask<TInput = unknown> {
  type: AgentTaskType;
  input: TInput;
  traceId: string;        // propagated across all hops for observability
  timeoutMs?: number;
}

export interface AgentTaskResult<TOutput = unknown> {
  taskType: AgentTaskType;
  traceId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  output: TOutput;
  error?: string;
}

export type DispatchMode = "local" | "n8n" | "mcp";

export interface PipelineConfig {
  mode: DispatchMode;
  /** Used when mode = "n8n". Reads N8N_WEBHOOK_URL env var by default. */
  n8nWebhookUrl?: string;
  /** Used when mode = "mcp". Defaults to http://localhost:3100 (see docker-compose). */
  mcpServerUrl?: string;
  defaultTimeoutMs?: number;
}

// ── Local handler registry ────────────────────────────────────────────────────

type Handler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

// Lazy-imported to avoid bundling heavy agents into the Next.js client chunk.
async function runPricingMonitor(input: AgentRunOptions): Promise<PricingMonitorResult> {
  const { pricingMonitorAgent } = await import("./agents/pricing-monitor.agent");
  return pricingMonitorAgent.run(input);
}

async function runHubValidator(input: unknown): Promise<unknown> {
  const { hubValidatorAgent } = await import("./agents/hub-validator.agent");
  return hubValidatorAgent.run(input as Parameters<typeof hubValidatorAgent.run>[0]);
}

const LOCAL_HANDLERS: Record<AgentTaskType, Handler<unknown, unknown>> = {
  "pricing-monitor": runPricingMonitor as Handler<unknown, unknown>,
  "hub-validator":   runHubValidator,
  "cache-refresh":   async () => ({ refreshed: true, at: new Date().toISOString() }),
};

// ── Dispatch strategies ───────────────────────────────────────────────────────

async function dispatchLocal<TInput, TOutput>(
  task: AgentTask<TInput>,
): Promise<TOutput> {
  const handler = LOCAL_HANDLERS[task.type];
  if (!handler) throw new Error(`No local handler for task type "${task.type}"`);
  return handler(task.input) as Promise<TOutput>;
}

async function dispatchN8n<TInput, TOutput>(
  task: AgentTask<TInput>,
  webhookUrl: string,
): Promise<TOutput> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`n8n webhook returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<TOutput>;
}

async function dispatchMcp<TInput, TOutput>(
  task: AgentTask<TInput>,
  mcpUrl: string,
): Promise<TOutput> {
  // JSON-RPC 2.0 "tools/call" as per the MCP spec.
  const rpcPayload = {
    jsonrpc: "2.0",
    id: task.traceId,
    method: "tools/call",
    params: { name: task.type, arguments: task.input },
  };
  const res = await fetch(`${mcpUrl}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rpcPayload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`MCP server returned ${res.status}: ${body}`);
  }
  const rpc = (await res.json()) as { result?: TOutput; error?: { message: string } };
  if (rpc.error) throw new Error(`MCP error: ${rpc.error.message}`);
  return rpc.result as TOutput;
}

// ── Pipeline class ────────────────────────────────────────────────────────────

export class AgentPipeline {
  private readonly cfg: Required<PipelineConfig>;

  constructor(cfg: PipelineConfig) {
    this.cfg = {
      mode: cfg.mode,
      n8nWebhookUrl:    cfg.n8nWebhookUrl    ?? process.env.N8N_WEBHOOK_URL ?? "",
      mcpServerUrl:     cfg.mcpServerUrl     ?? process.env.MCP_SERVER_URL  ?? "http://localhost:3100",
      defaultTimeoutMs: cfg.defaultTimeoutMs ?? 30_000,
    };
  }

  async dispatch<TInput, TOutput>(
    task: Omit<AgentTask<TInput>, "traceId"> & { traceId?: string },
  ): Promise<AgentTaskResult<TOutput>> {
    const fullTask: AgentTask<TInput> = {
      ...task,
      traceId:   task.traceId ?? crypto.randomUUID(),
      timeoutMs: task.timeoutMs ?? this.cfg.defaultTimeoutMs,
    };

    const startedAt = new Date().toISOString();
    const t0 = Date.now();

    try {
      let output: TOutput;
      switch (this.cfg.mode) {
        case "n8n":
          output = await dispatchN8n<TInput, TOutput>(fullTask, this.cfg.n8nWebhookUrl);
          break;
        case "mcp":
          output = await dispatchMcp<TInput, TOutput>(fullTask, this.cfg.mcpServerUrl);
          break;
        default:
          output = await dispatchLocal<TInput, TOutput>(fullTask);
      }
      return {
        taskType:    fullTask.type,
        traceId:     fullTask.traceId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs:  Date.now() - t0,
        output,
      };
    } catch (err) {
      return {
        taskType:    fullTask.type,
        traceId:     fullTask.traceId,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs:  Date.now() - t0,
        output:      {} as TOutput,
        error:       (err as Error).message,
      };
    }
  }
}

// Singleton — switch mode via AGENT_DISPATCH_MODE env var.
const mode = (process.env.AGENT_DISPATCH_MODE ?? "local") as DispatchMode;
export const pipeline = new AgentPipeline({ mode });
