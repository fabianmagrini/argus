/**
 * Minimal mock Drizzle client for integration tests.
 *
 * Each public method returns a chainable "query builder" that is also a
 * thenable, so every call pattern used in the route handlers works:
 *
 *   await db.select().from(t)                  → result
 *   await db.select().from(t).where(...)        → result
 *   await db.select().from(t).where(...).limit(n) → result
 *   await db.insert(t).values(d).returning()   → result
 *   await db.update(t).set(d).where(...).returning() → result
 *   await db.delete(t).where(...).returning()  → result
 *   await db.execute(sql`...`)                 → { rows: [] }
 */

import type { Db } from "../../src/routes/index.js";

class QueryBuilder<T> implements PromiseLike<T> {
  private readonly _result: T;

  constructor(result: T) {
    this._result = result;
  }

  from(): this { return this; }
  where(): this { return this; }
  orderBy(): this { return this; }
  groupBy(): this { return this; }
  limit(): this { return this; }
  offset(): Promise<T> { return Promise.resolve(this._result); }
  returning(): Promise<T> { return Promise.resolve(this._result); }
  set(): this { return this; }
  values(): this { return this; }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this._result).then(onFulfilled, onRejected);
  }
}

export interface MockDbOptions {
  /** Results returned by sequential db.select() calls (in order). */
  selectResults?: unknown[][];
  /** Fallback result for all db.select() calls not covered by selectResults. */
  selectFallback?: unknown[];
  /** Result returned by db.insert().values().returning(). */
  insertResult?: unknown[];
  /** Result returned by db.update().set().where().returning(). */
  updateResult?: unknown[];
  /** Result returned by db.delete().where().returning(). */
  deleteResult?: unknown[];
  /** Rows returned by db.execute(). */
  executeRows?: unknown[];
}

export function createMockDb(opts: MockDbOptions = {}): Db {
  let selectCallIndex = 0;

  const nextSelectResult = (): unknown[] => {
    if (opts.selectResults && selectCallIndex < opts.selectResults.length) {
      return opts.selectResults[selectCallIndex++] ?? [];
    }
    return opts.selectFallback ?? [];
  };

  return {
    select: () => new QueryBuilder(nextSelectResult()),
    insert: () => new QueryBuilder(opts.insertResult ?? []),
    update: () => new QueryBuilder(opts.updateResult ?? []),
    delete: () => new QueryBuilder(opts.deleteResult ?? []),
    execute: () => Promise.resolve({ rows: opts.executeRows ?? [] } as any),
  } as unknown as Db;
}
