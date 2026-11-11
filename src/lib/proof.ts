// Ed25519-signed review proofs. Anyone (a shopper, a marketplace, an AI agent) can check a proof
// with the public key at /.well-known/receipted-key.json without trusting this server's HTML.
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify, type KeyObject } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { OrderRec, ReviewRec } from "./db";

let keys: { priv: KeyObject; pub: KeyObject } | null = null;

const KEY_FILE = path.join(process.cwd(), ".data", "signing-key.pem");

/** RECEIPTED_SIGNING_KEY (PKCS8 PEM, \n allowed) in production; a generated dev key otherwise. */
async function getKeys() {
  if (keys) return keys;
  let pem = process.env.RECEIPTED_SIGNING_KEY?.replace(/\\n/g, "\n");
  if (!pem) {
    try {
      pem = await fs.readFile(KEY_FILE, "utf8");
    } catch {
      const { privateKey } = generateKeyPairSync("ed25519");
      pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
      await fs.mkdir(path.dirname(KEY_FILE), { recursive: true });
      await fs.writeFile(KEY_FILE, pem);
    }
  }
  const priv = createPrivateKey(pem);
  keys = { priv, pub: createPublicKey(priv) };
  return keys;
}

export async function publicKeyJwk() {
  const { pub } = await getKeys();
  return { ...pub.export({ format: "jwk" }), kid: "receipted-1", alg: "EdDSA", use: "sig" };
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Stable JSON: keys sorted, no whitespace. The bytes that get signed. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

export type ProofPayload = {
  v: 1;
  kid: "receipted-1";
  review_id: string;
  product_id: string;
  rating: number;
  body_sha256: string;
  status: "proven" | "revoked";
  reason?: string;
  // Hashes, not raw IDs: the proof shows a real capture exists without exposing it.
  order_hash: string;
  capture_hash: string;
  paid_at: string;
  amount: string;
  currency: "USD";
  checks: { same_payer: "payer_id" | "email"; capture_completed: true; refunded: boolean; disputed: boolean };
  issued_at: string;
};

export function payloadFor(review: ReviewRec, order: OrderRec): ProofPayload {
  return {
    v: 1,
    kid: "receipted-1",
    review_id: review.id,
    product_id: review.productId,
    rating: review.rating,
    body_sha256: sha256(`${review.title}\n${review.body}`),
    status: review.proof?.status ?? "revoked",
    reason: review.proof?.reason,
    order_hash: sha256(`order:${order.orderId}`),
    capture_hash: sha256(`capture:${order.captureId ?? ""}`),
    paid_at: order.paidAt ?? order.createdAt,
    amount: order.amount,
    currency: "USD",
    checks: {
      same_payer: review.matchedOn ?? "email",
      capture_completed: true,
      refunded: order.status === "refunded" || order.status === "reversed",
      disputed: order.status === "disputed",
    },
    issued_at: review.proof?.changedAt ?? review.createdAt,
  };
}

export async function signPayload(p: ProofPayload) {
  const { priv } = await getKeys();
  return sign(null, Buffer.from(canonical(p)), priv).toString("base64");
}

export async function verifyPayload(p: ProofPayload, signature: string) {
  const { pub } = await getKeys();
  try {
    return verify(null, Buffer.from(canonical(p)), pub, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export { sha256 };
