import { NextResponse } from "next/server";
import { refundCapture } from "@/lib/paypal";
import { readGate } from "@/lib/gateStore";

// Step 5: refund the capture. The proof flips only when PayPal's verified webhook confirms it.
export async function POST(req: Request) {
  const { orderId } = (await req.json()) as { orderId?: string };
  const order = (await readGate()).orders.find((o) => o.orderId === orderId);
  if (!order?.captureId) return NextResponse.json({ error: "No capture for that order" }, { status: 400 });
  const refund = await refundCapture(order.captureId);
  return NextResponse.json({ refundId: refund.id, status: refund.status });
}
