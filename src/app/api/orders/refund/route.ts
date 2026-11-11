import { NextResponse } from "next/server";
import { z } from "zod";
import { refundCapture } from "@/lib/paypal";
import { readDb } from "@/lib/db";

// Merchant action from the console. The proof flips only when PayPal's verified webhook arrives.
export async function POST(req: Request) {
  try {
    const { orderId } = z.object({ orderId: z.string() }).parse(await req.json());
    const order = (await readDb()).orders.find((o) => o.orderId === orderId);
    if (!order?.captureId) return NextResponse.json({ error: "No capture on this order" }, { status: 400 });
    const r = await refundCapture(order.captureId);
    return NextResponse.json({ refundId: r.id, status: r.status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "refund failed" }, { status: 500 });
  }
}
