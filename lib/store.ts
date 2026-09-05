import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import postgres from "postgres";

import type { StoreState } from "@/lib/types";

const ROW_ID = "default";
const LOCAL_PATH = join(process.cwd(), "data", "state.json");

const EMPTY_STATE: StoreState = {
  officialSince: "2026-09-06",
  processed: {},
  updatedAt: new Date(0).toISOString(),
};

function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

function sqlClient() {
  const url = databaseUrl();
  if (!url) return null;
  return postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
    ssl: "require",
  });
}

async function ensureTable(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS influencer_ingest_state (
      id text PRIMARY KEY,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function readDatabase(): Promise<StoreState | null> {
  const sql = sqlClient();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = await sql<{ payload: StoreState }[]>`
      SELECT payload FROM influencer_ingest_state WHERE id = ${ROW_ID}
    `;
    return rows[0]?.payload ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function writeDatabase(state: StoreState): Promise<void> {
  const sql = sqlClient();
  if (!sql) throw new Error("DATABASE_URL is not set");
  try {
    await ensureTable(sql);
    await sql`
      INSERT INTO influencer_ingest_state (id, payload, updated_at)
      VALUES (${ROW_ID}, ${sql.json(state as never)}, now())
      ON CONFLICT (id) DO UPDATE
      SET payload = excluded.payload, updated_at = now()
    `;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function readLocal(): StoreState | null {
  try {
    if (!existsSync(LOCAL_PATH)) return null;
    return JSON.parse(readFileSync(LOCAL_PATH, "utf8")) as StoreState;
  } catch {
    return null;
  }
}

function writeLocal(state: StoreState): void {
  mkdirSync(dirname(LOCAL_PATH), { recursive: true });
  writeFileSync(LOCAL_PATH, JSON.stringify(state, null, 2));
}

export async function loadState(): Promise<StoreState> {
  if (databaseUrl()) {
    return (await readDatabase()) ?? EMPTY_STATE;
  }
  return readLocal() ?? EMPTY_STATE;
}

export async function saveState(state: StoreState): Promise<void> {
  const next = { ...state, updatedAt: new Date().toISOString() };
  if (databaseUrl()) {
    await writeDatabase(next);
    return;
  }
  writeLocal(next);
}

export function storageBackend(): "supabase" | "local-file" {
  return databaseUrl() ? "supabase" : "local-file";
}
