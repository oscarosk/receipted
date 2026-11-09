import { NextRequest, NextResponse } from "next/server";
import { identityFromCode } from "@/lib/paypal";
import { readGate, updateGate } from "@/lib/gateStore";
import { baseUrl } from "@/lib/baseUrl";

// Step 4: the heart of Receipted. Is the person signing in the same PayPal account that paid?
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = baseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const expected = req.cookies.get("rc_login_state")?.value;
  if (!code || !expected || state !== expected) {
    return NextResponse.redirect(`${base}/gate?error=${encodeURIComponent("Sign-in state did not match; please try again")}`);
  }
  const orderId = state.split(".")[0];
  try {
    const who = await identityFromCode(code);
    const { orders } = await readGate();
    const order = orders.find((o) => o.orderId === orderId);
    const reviewerPayerId = who.payer_id;
    const matches = Boolean(order?.payerId && reviewerPayerId && order.payerId === reviewerPayerId);
    await updateGate((s) => {
      s.checks.unshift({
        orderId,
        reviewerPayerId,
        verifiedAccount: who.verified_account === true || who.verified_account === "true",
        matches,
        at: new Date().toISOString(),
        note: reviewerPayerId ? undefined : "PayPal did not return a payer ID; check the app's Log in with PayPal attributes",
      });
    });
    const res = NextResponse.redirect(`${base}/gate?order=${orderId}`);
    res.cookies.delete("rc_login_state");
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "login failed");
    return NextResponse.redirect(`${base}/gate?error=${msg}`);
  }
}
