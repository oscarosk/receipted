import { NextResponse } from "next/server";
import { z } from "zod";
import { product, STORES } from "@/lib/catalog";
import { createOrder } from "@/lib/paypal";
import { newId, writeDb } from "@/lib/db";
import { baseUrl } from "@/lib/baseUrl";

const Body = z.object({ productId: z.string() });

// Creates a PayPal order for one product and returns the PayPal approval link.
export async function POST(req: Request) {
  try {
    const { productId } = Body.parse(await req.json());
    const p = product(productId);
    if (!p) return NextResponse.json({ error: "Unknown product" }, { status: 404 });
    const base = baseUrl(req);
    const ref = newId("ord");
    const order = await createOrder({
      amount: p.price,
      description: p.name,
      referenceId: ref,
      returnUrl: `${base}/api/orders/return`,
      cancelUrl: `${base}/store/${p.store}/${p.id}`,
      brandName: `${STORES[p.store].name} (demo)`,
    });
    const now = new Date().toISOString();
    await writeDb((db) => {
      db.orders.unshift({
        orderId: order.id,
        productId: p.id,
        store: p.store,
        amount: p.price,
        status: "created",
        createdAt: now,
        history: [{ at: now, status: "created", source: "orders api" }],
      });
    });
    const approveUrl = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    return NextResponse.json({ orderId: order.id, approveUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "order failed" }, { status: 500 });
  }
}
