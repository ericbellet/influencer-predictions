import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { StoreState } from "@/lib/types";

const BLOB_PATH = "influencer-state.json";
const LOCAL_PATH = join(process.cwd(), "data", "state.json");

const EMPTY_STATE: StoreState = {
  officialSince: "2026-09-06",
  processed: {},
  updatedAt: new Date(0).toISOString(),
};

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBlob(): Promise<StoreState | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const url = blobs[0]?.url;
    if (!url) return null;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as StoreState;
  } catch {
    return null;
  }
}

async function writeBlob(state: StoreState): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(BLOB_PATH, JSON.stringify(state, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
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
  if (hasBlob()) {
    return (await readBlob()) ?? EMPTY_STATE;
  }
  return readLocal() ?? EMPTY_STATE;
}

export async function saveState(state: StoreState): Promise<void> {
  const next = { ...state, updatedAt: new Date().toISOString() };
  if (hasBlob()) {
    await writeBlob(next);
    return;
  }
  writeLocal(next);
}
