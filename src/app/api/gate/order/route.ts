import { NextResponse } from "next/server";
import { createOrder } from "@/lib/paypal";
import { updateGate } from "@/lib/gateStore";
import { baseUrl } from "@/lib/baseUrl";

// Step 1: create a sandbox order and send the buyer to PayPal to approve it.
export async function POST(req: Request) {
  try {
    const base = baseUrl(req);
    const ref = `gate-${Date.now()}`;
    const order = await createOrder({
      amount: "79.00",
      description: "Quiet Hour Audio QH-1 headphones (demo)",
      referenceId: ref,
      returnUrl: `${base}/api/gate/return`,
      cancelUrl: `${base}/gate`,
    });
    await updateGate((s) => {
      s.orders.unshift({ orderId: order.id, status: order.status, amount: "79.00", createdAt: new Date().toISOString() });
    });
    const approve = order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!approve) return NextResponse.json({ error: "No approval link from PayPal" }, { status: 502 });
    return NextResponse.json({ orderId: order.id, approveUrl: approve });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create the order" }, { status: 500 });
  }
}
