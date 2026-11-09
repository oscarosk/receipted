import { NextResponse } from "next/server";
import { verifyWebhook, captureIdFromRefund, type WebhookEvent } from "@/lib/paypal";
import { updateGate } from "@/lib/gateStore";

const REFUND_EVENTS = new Set(["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"]);

// PayPal posts events here. Unverified deliveries are recorded but never acted on.
// Replaying the same event id changes nothing (idempotent).
export async function POST(req: Request) {
  const event = (await req.json()) as WebhookEvent;
  let verified = false;
  try {
    verified = await verifyWebhook(req.headers, event);
  } catch {
    verified = false;
  }
  const captureId =
    event.event_type === "PAYMENT.CAPTURE.REFUNDED" ? captureIdFromRefund(event) : (event.resource.id as string | undefined);
  await updateGate((s) => {
    if (s.events.some((e) => e.id === event.id)) return;
    s.events.unshift({ id: event.id, type: event.event_type, verified, captureId, at: new Date().toISOString() });
    if (verified && REFUND_EVENTS.has(event.event_type) && captureId) {
      const o = s.orders.find((x) => x.captureId === captureId);
      if (o) o.refunded = true;
    }
  });
  // Always 200 so PayPal stops retrying; verification decides whether we act.
  return NextResponse.json({ received: true, verified });
}
