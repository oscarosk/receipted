import { NextRequest, NextResponse } from "next/server";
import { emailOf, identityFromCode } from "@/lib/paypal";
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
    // Strong match: the PayPal account ID. Fallback when that attribute is not granted: the account email.
    const reviewerEmail = emailOf(who);
    const byId = Boolean(order?.payerId && reviewerPayerId && order.payerId === reviewerPayerId);
    const byEmail =
      !reviewerPayerId && Boolean(order?.payerEmail && reviewerEmail && order.payerEmail.toLowerCase() === reviewerEmail);
    const matches = byId || byEmail;
    await updateGate((s) => {
      s.checks.unshift({
        orderId,
        reviewerPayerId,
        verifiedAccount: who.verified_account === true || who.verified_account === "true",
        matches,
        at: new Date().toISOString(),
        note: reviewerPayerId
          ? "matched on PayPal account ID"
          : reviewerEmail
            ? `no payer ID granted; compared account email ${reviewerEmail}`
            : "PayPal returned neither payer ID nor email; check the app's Log in with PayPal attributes",
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
