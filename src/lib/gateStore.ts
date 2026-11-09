// Tiny file-backed store for the day-1 gate. The real app moves to Postgres.
import { promises as fs } from "fs";
import path from "path";

export type GateOrder = {
  orderId: string;
  status: string;
  payerId?: string;
  payerEmail?: string;
  captureId?: string;
  amount?: string;
  refunded?: boolean;
  createdAt: string;
};

export type GateCheck = {
  orderId: string;
  reviewerPayerId?: string;
  verifiedAccount?: boolean;
  matches: boolean;
  at: string;
  note?: string;
};

export type GateEvent = { id: string; type: string; verified: boolean; captureId?: string; at: string };

type State = { orders: GateOrder[]; checks: GateCheck[]; events: GateEvent[] };

const FILE = path.join(process.cwd(), ".data", "gate.json");

async function load(): Promise<State> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as State;
  } catch {
    return { orders: [], checks: [], events: [] };
  }
}

async function save(state: State) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 2));
}

export async function readGate() {
  return load();
}

export async function updateGate(fn: (s: State) => void) {
  const s = await load();
  fn(s);
  await save(s);
  return s;
}
