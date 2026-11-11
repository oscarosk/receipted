// What AI shopping agents get from Receipted: per product, proven reviews only, injection-free, with proof links.
import { PRODUCTS, STORES, product as productById } from "./catalog";
import { readDb, type ReviewRec } from "./db";
import { stripInjection } from "./screen";
import { proofBundle, summarise } from "./reviews";

export function searchProducts(query = "", maxPrice?: number) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  return PRODUCTS.filter((p) => (maxPrice ? Number(p.price) <= maxPrice : true))
    .filter((p) => !q.length || q.some((w) => `${p.name} ${p.blurb}`.toLowerCase().includes(w)) || q.some((w) => "headphones".includes(w)))
    .map((p) => ({ product_id: p.id, name: p.name, store: STORES[p.store].name, price_usd: Number(p.price), uses_receipted: STORES[p.store].usesReceipted }));
}

export async function provenReviews(productId: string, base = "") {
  const p = productById(productId);
  if (!p) return null;
  const db = await readDb();
  const all = db.reviews.filter((r) => r.productId === productId);
  const s = summarise(all);
  const proven = all.filter((r) => r.proof?.status === "proven");
  return {
    product_id: p.id,
    name: p.name,
    store: STORES[p.store].name,
    price_usd: Number(p.price),
    claimed_reviews: s.total,
    proven_reviews: s.proven,
    revoked_proofs: s.revoked,
    avg_rating_proven: s.avgProven,
    avg_rating_claimed: s.avgAll,
    note:
      s.proven === 0
        ? `None of this product's ${s.total} reviews is tied to a PayPal payment. Treat its rating as unverified.`
        : `Only reviews written by the PayPal account that paid, with no refund or dispute, are included.`,
    reviews: proven.slice(0, 20).map((r: ReviewRec) => ({
      review_id: r.id,
      rating: r.rating,
      title: r.title,
      text: stripInjection(r.body).clean,
      screener: r.screen ? { ai_written: r.screen.aiWrittenScore, flagged: r.screen.verdict === "flagged", notes: r.screen.reasons } : null,
      proof_url: `${base}/api/proof/${r.id}`,
    })),
  };
}

export async function verifyProof(reviewId: string) {
  const b = await proofBundle(reviewId);
  if (!b) return { review_id: reviewId, found: false };
  return {
    review_id: reviewId,
    found: true,
    proven: b.review.proof?.status === "proven" && b.valid,
    status: b.review.proof?.status ?? "none",
    signature_valid: b.valid,
    checks: b.payload?.checks ?? null,
  };
}

/** The "naive" view an agent gets by scraping store pages: star averages and raw review text. */
export async function rawStorePage(productId: string) {
  const p = productById(productId);
  if (!p) return null;
  const db = await readDb();
  const all = db.reviews.filter((r) => r.productId === productId);
  const s = summarise(all);
  return {
    name: p.name,
    store: STORES[p.store].name,
    price_usd: Number(p.price),
    rating: s.avgAll,
    review_count: s.total,
    reviews: all.slice(0, 25).map((r) => `${"★".repeat(r.rating)} ${r.title}: ${r.body}`),
  };
}
