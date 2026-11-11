import { NextResponse } from "next/server";
import { verifyWebhook, captureIdFromRefund, type WebhookEvent } from "@/lib/paypal";
import { updateGate } from "@/lib/gateStore";
import { readDb, writeDb, type OrderStatus } from "@/lib/db";
import { setOrderStatus } from "@/lib/reviews";

// Which PayPal events move a proof, and where.
const STATUS_FOR: Record<string, OrderStatus> = {
  "PAYMENT.CAPTURE.REFUNDED": "refunded",
  "PAYMENT.CAPTURE.REVERSED": "reversed",
  "CUSTOMER.DISPUTE.CREATED": "disputed",
};

function captureIdOf(event: WebhookEvent): string | undefined {
  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") return captureIdFromRefund(event);
  if (event.event_type.startsWith("CUSTOMER.DISPUTE")) {
    const tx = (event.resource.disputed_transactions as { seller_transaction_id?: string }[] | undefined)?.[0];
    return tx?.seller_transaction_id;
  }
  return event.resource.id as string | undefined;
}

// Unverified deliveries are logged but never acted on. Replaying an event id changes nothing.
export async function POST(req: Request) {
  const event = (await req.json()) as WebhookEvent;
  let verified = false;
  try {
    verified = await verifyWebhook(req.headers, event);
  } catch {
    verified = false;
  }
  const captureId = captureIdOf(event);
  const at = new Date().toISOString();

  // Day-1 gate log.
  await updateGate((s) => {
    if (s.events.some((e) => e.id === event.id)) return;
    s.events.unshift({ id: event.id, type: event.event_type, verified, captureId, at });
    if (verified && (event.event_type === "PAYMENT.CAPTURE.REFUNDED" || event.event_type === "PAYMENT.CAPTURE.REVERSED") && captureId) {
      const o = s.orders.find((x) => x.captureId === captureId);
      if (o) o.refunded = true;
    }
  });

  if ((await readDb()).events.some((e) => e.id === event.id)) return NextResponse.json({ received: true, duplicate: true });

  let effect = verified ? "no effect" : "ignored: signature not verified";
  if (verified && captureId) {
    let status = STATUS_FOR[event.event_type];
    if (event.event_type === "CUSTOMER.DISPUTE.RESOLVED") {
      const outcome = (event.resource.dispute_outcome as { outcome_code?: string } | undefined)?.outcome_code ?? "";
      status = /SELLER|CANCELED/.test(outcome) ? "paid" : "refunded";
    }
    if (status) effect = await setOrderStatus(captureId, status, event.event_type);
  }
  await writeDb((db) => {
    if (!db.events.some((e) => e.id === event.id)) db.events.unshift({ id: event.id, type: event.event_type, verified, captureId, at, effect });
    db.events = db.events.slice(0, 500);
  });
  return NextResponse.json({ received: true, verified, effect });
}
