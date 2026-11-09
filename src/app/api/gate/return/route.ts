import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/paypal";
import { updateGate } from "@/lib/gateStore";
import { baseUrl } from "@/lib/baseUrl";

// Step 2: PayPal sends the buyer back here after approval; we capture on the server
// and record who paid (payer ID) and the capture ID that refunds will point at.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("token");
  const base = baseUrl(req);
  if (!orderId) return NextResponse.redirect(`${base}/gate?error=missing-order`);
  try {
    const order = await captureOrder(orderId);
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    await updateGate((s) => {
      const o = s.orders.find((x) => x.orderId === orderId);
      if (o) {
        o.status = order.status;
        o.payerId = order.payer?.payer_id;
        o.payerEmail = order.payer?.email_address;
        o.captureId = capture?.id;
      }
    });
    return NextResponse.redirect(`${base}/gate?order=${orderId}`);
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "capture failed");
    return NextResponse.redirect(`${base}/gate?error=${msg}`);
  }
}
