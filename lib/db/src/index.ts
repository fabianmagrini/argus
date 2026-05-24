/**
 * @argus/db
 *
 * Exports a singleton Drizzle database client and all schema table definitions.
 * Requires the `DATABASE_URL` environment variable to be set.
 *
 * @packageDocumentation
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/** Shared connection pool — reuse across the process lifetime. */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/** Drizzle database client with all schema tables registered. */
export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
