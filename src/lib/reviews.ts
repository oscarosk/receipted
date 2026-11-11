// Review lifecycle: create a proven review, and flip proofs when PayPal reports money moving back.
import { product } from "./catalog";
import { newId, readDb, writeDb, type OrderRec, type OrderStatus, type ReviewRec } from "./db";
import { payloadFor, signPayload, verifyPayload } from "./proof";
import { screenReview } from "./screen";

export async function createProvenReview(args: {
  orderId: string;
  matchedOn: "payer_id" | "email";
  rating: number;
  title: string;
  body: string;
  author?: string;
}) {
  const { body, screen } = await screenReview(args.title, args.body);
  return writeDb(async (db) => {
    const order = db.orders.find((o) => o.orderId === args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "paid") throw new Error(`This order is ${order.status}, so it can't carry a proven review`);
    if (db.reviews.some((r) => r.orderId === order.orderId)) throw new Error("This order already has a review");
    const now = new Date().toISOString();
    const review: ReviewRec = {
      id: newId("rv"),
      productId: order.productId,
      store: order.store,
      orderId: order.orderId,
      rating: args.rating,
      title: args.title.trim().slice(0, 120),
      body: body.slice(0, 2000),
      author: args.author || order.payerName || "Verified buyer",
      createdAt: now,
      proof: { status: "proven", changedAt: now },
      screen,
      matchedOn: args.matchedOn,
    };
    review.signature = await signPayload(payloadFor(review, order));
    db.reviews.unshift(review);
    return review;
  });
}

const REVOKING: OrderStatus[] = ["refunded", "reversed", "disputed"];

/** Moves an order to a new status and re-signs every review on it. Returns what changed, for the event log. */
export async function setOrderStatus(captureId: string, status: OrderStatus, source: string) {
  return writeDb(async (db) => {
    const order = db.orders.find((o) => o.captureId === captureId);
    if (!order) return "no matching order";
    if (order.status === status) return `already ${status}`;
    order.status = status;
    order.history.push({ at: new Date().toISOString(), status, source });
    let flipped = 0;
    for (const r of db.reviews.filter((x) => x.orderId === order.orderId && x.proof)) {
      const next = REVOKING.includes(status) ? "revoked" : "proven";
      if (r.proof!.status !== next) flipped++;
      r.proof = { status: next, reason: next === "revoked" ? `order ${status}` : undefined, changedAt: new Date().toISOString() };
      r.signature = await signPayload(payloadFor(r, order));
    }
    return `order ${status}; ${flipped} proof${flipped === 1 ? "" : "s"} ${REVOKING.includes(status) ? "revoked" : "restored"}`;
  });
}

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  proven: boolean;
  proofStatus: "proven" | "revoked" | "none";
  proofUrl?: string;
  flags: string[];
  aiWrittenScore?: number;
};

export function toPublic(r: ReviewRec, base = ""): PublicReview {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    author: r.author,
    createdAt: r.createdAt,
    proven: r.proof?.status === "proven",
    proofStatus: r.proof?.status ?? "none",
    proofUrl: r.proof ? `${base}/proof/${r.id}` : undefined,
    flags: r.screen?.verdict === "flagged" ? r.screen.reasons : [],
    aiWrittenScore: r.screen?.aiWrittenScore,
  };
}

export async function reviewsFor(productId: string) {
  const db = await readDb();
  return db.reviews.filter((r) => r.productId === productId);
}

export function summarise(reviews: ReviewRec[]) {
  const proven = reviews.filter((r) => r.proof?.status === "proven");
  const avg = (xs: ReviewRec[]) => (xs.length ? Number((xs.reduce((a, r) => a + r.rating, 0) / xs.length).toFixed(2)) : null);
  return {
    total: reviews.length,
    proven: proven.length,
    revoked: reviews.filter((r) => r.proof?.status === "revoked").length,
    unproven: reviews.filter((r) => !r.proof).length,
    avgAll: avg(reviews),
    avgProven: avg(proven),
  };
}

export async function proofBundle(reviewId: string) {
  const db = await readDb();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return null;
  const order: OrderRec | undefined = review.orderId ? db.orders.find((o) => o.orderId === review.orderId) : undefined;
  if (!review.proof || !order || !review.signature) return { review, order, payload: null, signature: null, valid: false, product: product(review.productId) };
  const payload = payloadFor(review, order);
  const valid = await verifyPayload(payload, review.signature);
  return { review, order, payload, signature: review.signature, valid, product: product(review.productId) };
}
