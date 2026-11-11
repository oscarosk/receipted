// A short-lived, HMAC-signed cookie saying "PayPal confirmed this browser belongs to the payer of order X".
import { createHmac, timingSafeEqual } from "crypto";

export const REVIEWER_COOKIE = "rc_reviewer";

export type ReviewerGrant = { orderId: string; matchedOn: "payer_id" | "email"; name?: string; exp: number };

function secret() {
  const s = process.env.SESSION_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  if (!s) throw new Error("SESSION_SECRET (or PAYPAL_CLIENT_SECRET) must be set");
  return s;
}

const mac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function encodeGrant(g: Omit<ReviewerGrant, "exp">, ttlSeconds = 1800) {
  const data = Buffer.from(JSON.stringify({ ...g, exp: Date.now() + ttlSeconds * 1000 })).toString("base64url");
  return `${data}.${mac(data)}`;
}

export function decodeGrant(value: string | undefined): ReviewerGrant | null {
  if (!value) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(mac(data));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const g = JSON.parse(Buffer.from(data, "base64url").toString()) as ReviewerGrant;
    return g.exp > Date.now() ? g : null;
  } catch {
    return null;
  }
}
