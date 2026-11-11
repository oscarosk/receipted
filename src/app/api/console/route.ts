import { NextResponse, connection } from "next/server";
import { readDb } from "@/lib/db";
import { product } from "@/lib/catalog";
import { heuristicScreen, stripInjection } from "@/lib/screen";

// Everything the merchant console grid needs, flattened into rows.
export async function GET() {
  await connection();
  const db = await readDb();
  const orderById = new Map(db.orders.map((o) => [o.orderId, o]));
  // Review farms reuse sentences. Count how many reviews share each sentence.
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 25);
  const freq = new Map<string, number>();
  for (const r of db.reviews) for (const x of new Set(sentences(r.body))) freq.set(x, (freq.get(x) ?? 0) + 1);
  const reviews = db.reviews.map((r) => {
    const o = r.orderId ? orderById.get(r.orderId) : undefined;
    // Unproven (MegaBoom) reviews were never screened at write time; score them here for comparison.
    const injected = stripInjection(r.body).removed.length > 0;
    const sc = r.screen ?? { ...heuristicScreen(r.title, r.body), injectionRemoved: injected, model: "heuristic" };
    const repeated = Math.max(0, ...sentences(r.body).map((x) => (freq.get(x) ?? 1) - 1));
    return {
      id: r.id,
      store: r.store === "megaboom" ? "MegaBoom" : "Quiet Hour",
      repeated,
      likelyFake: !r.proof && (sc.aiWrittenScore >= 0.6 || repeated >= 5),
      product: product(r.productId)?.name ?? r.productId,
      rating: r.rating,
      title: r.title,
      author: r.author,
      createdAt: r.createdAt,
      proof: r.proof?.status ?? "none",
      matchedOn: r.matchedOn ?? "",
      aiScore: sc.aiWrittenScore,
      injection: sc.injectionRemoved || injected,
      flags: sc.reasons.join("; "),
      orderId: r.orderId ?? "",
      orderStatus: o?.status ?? "",
      amount: o ? Number(o.amount) : null,
      seeded: Boolean(r.seeded),
    };
  });
  const orders = db.orders.map((o) => ({
    orderId: o.orderId,
    store: o.store,
    product: product(o.productId)?.name ?? o.productId,
    amount: Number(o.amount),
    status: o.status,
    payer: o.payerName ?? "",
    captureId: o.captureId ?? "",
    paidAt: o.paidAt ?? "",
    reviewed: db.reviews.some((r) => r.orderId === o.orderId),
  }));
  return NextResponse.json({ reviews, orders, events: db.events.slice(0, 50) });
}
