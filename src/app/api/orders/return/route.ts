import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { writeDb } from "@/lib/db";
import { baseUrl } from "@/lib/baseUrl";

// PayPal sends the buyer back here after approval. We capture server-side and record who paid.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const orderId = new URL(req.url).searchParams.get("token");
  if (!orderId) return NextResponse.redirect(`${base}/store/quiet-hour`);
  try {
    const o = await captureOrder(orderId);
    const capture = o.purchase_units?.[0]?.payments?.captures?.[0];
    await writeDb((db) => {
      const rec = db.orders.find((x) => x.orderId === orderId);
      if (!rec || rec.status !== "created") return;
      const now = new Date().toISOString();
      rec.status = capture?.status === "COMPLETED" ? "paid" : "created";
      rec.payerId = o.payer?.payer_id;
      rec.payerEmail = o.payer?.email_address?.toLowerCase();
      rec.payerName = [o.payer?.name?.given_name, o.payer?.name?.surname?.slice(0, 1)].filter(Boolean).join(" ") || undefined;
      rec.captureId = capture?.id;
      rec.paidAt = now;
      rec.history.push({ at: now, status: rec.status, source: `capture ${capture?.status ?? "?"}` });
    });
    return NextResponse.redirect(`${base}/orders/${orderId}`);
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "capture failed");
    return NextResponse.redirect(`${base}/orders/${orderId}?error=${msg}`);
  }
}
