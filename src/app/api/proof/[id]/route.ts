import { NextResponse } from "next/server";
import { proofBundle } from "@/lib/reviews";
import { getCapture } from "@/lib/paypal";

// Machine-readable proof: the signed payload, its signature, and PayPal's live view of the capture.
export async function GET(_req: Request, ctx: RouteContext<"/api/proof/[id]">) {
  const { id } = await ctx.params;
  const b = await proofBundle(id);
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!b.payload) return NextResponse.json({ review_id: id, proven: false, reason: "no PayPal proof attached to this review" });
  let paypal: { capture_status: string } | { error: string };
  try {
    paypal = { capture_status: (await getCapture(b.order!.captureId!)).status };
  } catch {
    paypal = { error: "PayPal lookup unavailable" };
  }
  return NextResponse.json({
    payload: b.payload,
    signature: b.signature,
    alg: "Ed25519",
    key: "/.well-known/receipted-key.json",
    signature_valid: b.valid,
    paypal_live: paypal,
  });
}
