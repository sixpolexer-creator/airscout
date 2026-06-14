/**
 * Graph DB client — Step 3.
 * Wraps a Neo4j (or Memgraph, AuraDB) Bolt connection.
 *
 * Install driver:  npm install neo4j-driver
 * Env vars:        GRAPH_DB_URI, GRAPH_DB_USER, GRAPH_DB_PASSWORD
 *
 * Usage:
 *   import { graphDb } from "@/lib/db/graph-client";
 *   const rows = await graphDb.query<{ code: string }>(
 *     "MATCH (a:Airport {code: $code}) RETURN a.code AS code",
 *     { code: "TLV" }
 *   );
 */

// neo4j-driver is a peer dependency (npm install neo4j-driver).
// Using `any` stubs so the project compiles without the package installed.
// Swap for `import type { Driver, Session } from "neo4j-driver"` once installed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Driver = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Session = any;

interface QueryRow {
  [key: string]: unknown;
}

export class GraphClient {
  private driver: Driver | null = null;

  private async connect(): Promise<Driver> {
    if (this.driver) return this.driver;

    const uri  = process.env.GRAPH_DB_URI      ?? "bolt://localhost:7687";
    const user = process.env.GRAPH_DB_USER     ?? "neo4j";
    const pass = process.env.GRAPH_DB_PASSWORD ?? "airscout";

    // @ts-ignore — neo4j-driver is an optional peer dep; install with: npm install neo4j-driver
    const { default: neo4j } = await import("neo4j-driver");
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, pass), {
      maxConnectionPoolSize: 20,
      connectionAcquisitionTimeout: 5_000,
    });

    // Verify connectivity on first use.
    await this.driver.getServerInfo();
    return this.driver;
  }

  /** Execute a read query and return typed rows. */
  async query<T extends QueryRow>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const driver = await this.connect();
    const session: Session = driver.session({ defaultAccessMode: "READ" });
    try {
      const result = await session.run(cypher, params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.records.map((r: any) => r.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /** Execute a write query (CREATE / MERGE / SET) and return typed rows. */
  async write<T extends QueryRow>(
    cypher: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    const driver = await this.connect();
    const session: Session = driver.session({ defaultAccessMode: "WRITE" });
    try {
      const result = await session.run(cypher, params);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.records.map((r: any) => r.toObject() as T);
    } finally {
      await session.close();
    }
  }

  /** Graceful shutdown — call during process exit. */
  async close(): Promise<void> {
    await this.driver?.close();
    this.driver = null;
  }

  /** True when GRAPH_DB_URI is configured in env. */
  static isAvailable(): boolean {
    return Boolean(process.env.GRAPH_DB_URI);
  }
}

// Module-level singleton — safe in Next.js edge / Node runtimes.
export const graphDb = new GraphClient();
