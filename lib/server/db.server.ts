// ─── Optional server database ────────────────────────────────────────────────
// DATABASE_URL picks the backend:
//   postgres://… / postgresql://…  → Neon (serverless HTTP driver) — use this on Vercel
//   file:./data/jansahay.db        → SQLite via Node's built-in node:sqlite — local dev
//   (unset)                        → no database; the app keeps working on localStorage only
// Queries use Postgres-style $1, $2 placeholders and SQL that both engines accept.

export interface Db {
  kind: "postgres" | "sqlite";
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS citizens (
    mobile TEXT PRIMARY KEY,
    name TEXT,
    lang TEXT NOT NULL DEFAULT 'hi',
    state TEXT,
    district TEXT,
    aadhaar_last4 TEXT,
    bank_last4 TEXT,
    whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
    opted_in_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    reference_id TEXT PRIMARY KEY,
    mobile TEXT NOT NULL REFERENCES citizens(mobile) ON DELETE CASCADE,
    scheme_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    portal_url TEXT,
    status TEXT NOT NULL,
    fields_json TEXT NOT NULL,
    timeline_json TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    mobile TEXT NOT NULL REFERENCES citizens(mobile) ON DELETE CASCADE,
    reference_id TEXT,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS follow_ups_due ON follow_ups (done, sent_at, due_date)`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    mobile TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0
  )`,
];

async function connectPostgres(url: string): Promise<Db> {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  return {
    kind: "postgres",
    query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[],
  };
}

// Minimal typing for node:sqlite (the project's @types/node predates it).
interface SqliteStatement { all(...a: unknown[]): unknown[]; run(...a: unknown[]): unknown }
interface SqliteModule { DatabaseSync: new (file: string) => { exec(sql: string): void; prepare(sql: string): SqliteStatement } }

async function connectSqlite(url: string): Promise<Db> {
  const sqlite = process.getBuiltinModule("node:sqlite") as SqliteModule | undefined;
  if (!sqlite) throw new Error("SQLite needs Node.js ≥ 22.5 (node:sqlite); use a Postgres DATABASE_URL instead");
  const { DatabaseSync } = sqlite;
  const { mkdirSync } = await import("node:fs");
  const { dirname, resolve } = await import("node:path");
  const file = resolve(process.cwd(), url.replace(/^file:/, ""));
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  return {
    kind: "sqlite",
    // $1 → ?1 (SQLite's numbered-parameter syntax), booleans → 0/1.
    query: async <T,>(text: string, params: unknown[] = []) => {
      const stmt = db.prepare(text.replace(/\$(\d+)/g, "?$1"));
      const args = params.map(p => (typeof p === "boolean" ? Number(p) : p ?? null)) as (string | number | null)[];
      return (/^\s*(SELECT|WITH)|RETURNING/i.test(text) ? stmt.all(...args) : (stmt.run(...args), [])) as T[];
    },
  };
}

// Cached on globalThis so dev hot-reloads and concurrent requests share one connection + one schema run.
const g = globalThis as unknown as { __jansahayDb?: Promise<Db | null> };

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb(): Promise<Db | null> {
  if (g.__jansahayDb) return g.__jansahayDb;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return Promise.resolve(null);
  g.__jansahayDb = (async () => {
    const db = /^postgres(ql)?:\/\//.test(url) ? await connectPostgres(url) : await connectSqlite(url);
    for (const stmt of SCHEMA) await db.query(stmt);
    return db;
  })().catch(err => {
    g.__jansahayDb = undefined; // retry on the next request
    throw err;
  });
  return g.__jansahayDb;
}
