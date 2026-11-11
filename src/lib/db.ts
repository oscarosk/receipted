// File-backed store for orders, reviews and webhook events. Small, explicit and easy to reset for judges.
// Writes are serialised in-process so concurrent requests can't clobber each other.
import { promises as fs } from "fs";
import path from "path";
import type { StoreId } from "./catalog";

export type OrderStatus = "created" | "paid" | "refunded" | "disputed" | "reversed";

export type OrderRec = {
  orderId: string;
  productId: string;
  store: StoreId;
  amount: string;
  status: OrderStatus;
  payerId?: string;
  payerEmail?: string;
  payerName?: string;
  captureId?: string;
  paidAt?: string;
  createdAt: string;
  history: { at: string; status: OrderStatus; source: string }[];
};

export type ProofStatus = "proven" | "revoked";

export type Screen = {
  verdict: "clean" | "flagged";
  aiWrittenScore: number; // 0..1, likelihood the text is machine-written or templated
  incentivized: boolean;
  injectionRemoved: boolean;
  reasons: string[];
  model: string;
};

export type ReviewRec = {
  id: string;
  productId: string;
  store: StoreId;
  orderId?: string; // proven reviews only
  rating: number;
  title: string;
  body: string; // already cleaned of prompt-injection text
  author: string;
  createdAt: string;
  proof: { status: ProofStatus; reason?: string; changedAt?: string } | null; // null = unproven review
  screen?: Screen;
  matchedOn?: "payer_id" | "email";
  signature?: string; // base64 Ed25519 over the canonical proof payload
  seeded?: boolean; // demo data, labelled as such in the console
};

export type EventRec = { id: string; type: string; verified: boolean; captureId?: string; at: string; effect?: string };

type DB = { orders: OrderRec[]; reviews: ReviewRec[]; events: EventRec[] };

const FILE = path.join(process.cwd(), ".data", "receipted.json");
const SEED = path.join(process.cwd(), "data", "seed.json");

async function load(): Promise<DB> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as DB;
  } catch {
    try {
      return JSON.parse(await fs.readFile(SEED, "utf8")) as DB;
    } catch {
      return { orders: [], reviews: [], events: [] };
    }
  }
}

let chain: Promise<unknown> = Promise.resolve();

export function readDb() {
  return load();
}

export function writeDb<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = await load();
    const out = await fn(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 2));
    return out;
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Throws away live changes and goes back to the committed seed (used by judge mode). */
export async function resetDb() {
  await writeDb(async (db) => {
    const fresh = await (async () => {
      try {
        return JSON.parse(await fs.readFile(SEED, "utf8")) as DB;
      } catch {
        return { orders: [], reviews: [], events: [] };
      }
    })();
    db.orders = fresh.orders;
    db.reviews = fresh.reviews;
    db.events = fresh.events;
  });
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
