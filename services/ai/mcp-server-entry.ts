/**
 * MCP Server entry point (Step 2).
 * Exposes agent tools over JSON-RPC 2.0 so any MCP-compatible client
 * (Claude Code, an n8n MCP node, or a CrewAI MCP tool wrapper) can call them.
 *
 * Started by Docker:
 *   services/ai/docker-compose.agents.yml → mcp-server service
 *
 * Manually:
 *   npx tsx services/ai/mcp-server-entry.ts
 *
 * Endpoints:
 *   GET  /health       → 200 { status: "ok" }
 *   GET  /tools        → list of available tools + input schemas
 *   POST /rpc          → JSON-RPC 2.0 dispatcher (method: "tools/call")
 */

import http from "node:http";

const PORT = Number(process.env.PORT ?? 3100);

// ── Tool registry ─────────────────────────────────────────────────────────────

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown) => Promise<unknown>;
}

async function loadTools(): Promise<ToolDef[]> {
  const { pricingMonitorAgent } = await import("./agents/pricing-monitor.agent");
  const { hubValidatorAgent }   = await import("./agents/hub-validator.agent");

  return [
    {
      name: "pricing-monitor",
      description:
        "Monitor pricing trends and validate spot fares on major international hub routes " +
        "(TLV, LCA, LHR, JFK, DXB, …). Returns PricingMonitorResult with trend deltas " +
        "and deal/suppress recommendations.",
      inputSchema: {
        type: "object",
        properties: {
          hubs: {
            type: "array",
            items: { type: "string", description: "IATA airport code" },
            description: "Subset of MAJOR_HUB_CODES to monitor. Defaults to all 35.",
          },
          timeoutMs: { type: "number", description: "Abort after N milliseconds." },
        },
      },
      handler: (args) =>
        pricingMonitorAgent.run(args as Parameters<typeof pricingMonitorAgent.run>[0]),
    },
    {
      name: "hub-validator",
      description:
        "Check operational status of international hubs. Returns severity classifications " +
        "(none / advisory / warning / critical) and NOTAM-style alert arrays.",
      inputSchema: {
        type: "object",
        properties: {
          hubs: {
            type: "array",
            items: { type: "string", description: "IATA airport code" },
            description: "Subset of MAJOR_HUB_CODES to validate. Defaults to all 35.",
          },
          timeoutMs: { type: "number", description: "Abort after N milliseconds." },
        },
      },
      handler: (args) =>
        hubValidatorAgent.run(args as Parameters<typeof hubValidatorAgent.run>[0]),
    },
  ];
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type":   "application/json",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end",  () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ── JSON-RPC 2.0 dispatcher ───────────────────────────────────────────────────

async function handleRpc(
  body: string,
  tools: ToolDef[],
  res: http.ServerResponse,
): Promise<void> {
  let rpc: { jsonrpc: string; id: unknown; method: string; params?: unknown };
  try {
    rpc = JSON.parse(body);
  } catch {
    return json(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }

  if (rpc.method !== "tools/call") {
    return json(res, 200, {
      jsonrpc: "2.0",
      id: rpc.id,
      error: { code: -32601, message: `Method "${rpc.method}" not found. Supported: tools/call` },
    });
  }

  const params = rpc.params as { name?: string; arguments?: unknown } | undefined;
  const toolName = params?.name;
  const tool = tools.find((t) => t.name === toolName);

  if (!tool) {
    return json(res, 200, {
      jsonrpc: "2.0",
      id: rpc.id,
      error: {
        code: -32602,
        message: `Unknown tool "${toolName}". Available: ${tools.map((t) => t.name).join(", ")}`,
      },
    });
  }

  try {
    const result = await tool.handler(params?.arguments ?? {});
    json(res, 200, { jsonrpc: "2.0", id: rpc.id, result });
  } catch (err) {
    json(res, 200, {
      jsonrpc: "2.0",
      id: rpc.id,
      error: { code: -32603, message: (err as Error).message },
    });
  }
}

// ── Server bootstrap ──────────────────────────────────────────────────────────

async function start(): Promise<void> {
  const tools = await loadTools();

  const server = http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const url    = req.url   ?? "/";

    if (method === "GET" && url === "/health") {
      return json(res, 200, { status: "ok", tools: tools.map((t) => t.name) });
    }

    if (method === "GET" && url === "/tools") {
      return json(res, 200, {
        tools: tools.map((t) => ({
          name:        t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    }

    if (method === "POST" && url === "/rpc") {
      const body = await readBody(req).catch(() => "");
      return handleRpc(body, tools, res);
    }

    json(res, 404, { error: "Not found" });
  });

  server.listen(PORT, () => {
    console.log(`[mcp-server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[mcp-server] Tools: ${tools.map((t) => t.name).join(", ")}`);
  });

  process.on("SIGTERM", () => server.close(() => process.exit(0)));
  process.on("SIGINT",  () => server.close(() => process.exit(0)));
}

start().catch((err) => {
  console.error("[mcp-server] Fatal:", err);
  process.exit(1);
});
