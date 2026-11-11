import { NextRequest, NextResponse } from "next/server";
import { emailOf, identityFromCode, type UserInfo } from "@/lib/paypal";
import { readGate, updateGate } from "@/lib/gateStore";
import { readDb } from "@/lib/db";
import { baseUrl } from "@/lib/baseUrl";
import { encodeGrant, REVIEWER_COOKIE } from "@/lib/session";

/** The heart of Receipted: is the person signing in the same PayPal account that paid? */
function samePayer(order: { payerId?: string; payerEmail?: string } | undefined, who: UserInfo) {
  const email = emailOf(who);
  if (order?.payerId && who.payer_id) return { matches: order.payerId === who.payer_id, on: "payer_id" as const, email };
  if (order?.payerEmail && email) return { matches: order.payerEmail.toLowerCase() === email, on: "email" as const, email };
  return { matches: false, on: "email" as const, email };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = baseUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const expected = req.cookies.get("rc_login_state")?.value;
  const isReview = state.startsWith("r.");
  const orderId = isReview ? state.split(".")[1] : state.split(".")[0];
  const back = (q: string) => (isReview ? `${base}/review/${orderId}?${q}` : `${base}/gate?${q}`);

  if (url.searchParams.get("error")) return NextResponse.redirect(back(`error=${encodeURIComponent("PayPal sign-in was cancelled")}`));
  if (!code || !expected || state !== expected) {
    return NextResponse.redirect(back(`error=${encodeURIComponent("Sign-in state did not match; please try again")}`));
  }
  try {
    const who = await identityFromCode(code);

    if (isReview) {
      const order = (await readDb()).orders.find((o) => o.orderId === orderId);
      const m = samePayer(order, who);
      const res = NextResponse.redirect(
        m.matches ? back("verified=1") : back(`error=${encodeURIComponent("That PayPal account didn't pay for this order, so it can't review it")}`),
      );
      res.cookies.delete("rc_login_state");
      if (m.matches) {
        res.cookies.set(REVIEWER_COOKIE, encodeGrant({ orderId, matchedOn: m.on, name: order?.payerName }), {
          httpOnly: true,
          sameSite: "lax",
          secure: base.startsWith("https"),
          maxAge: 1800,
          path: "/",
        });
      }
      return res;
    }

    // Day-1 gate (kept as a self-test page).
    const order = (await readGate()).orders.find((o) => o.orderId === orderId);
    const m = samePayer(order, who);
    await updateGate((s) => {
      s.checks.unshift({
        orderId,
        reviewerPayerId: who.payer_id,
        verifiedAccount: who.verified_account === true || who.verified_account === "true",
        matches: m.matches,
        at: new Date().toISOString(),
        note: m.on === "payer_id" ? "matched on PayPal account ID" : m.email ? `no payer ID granted; compared account email ${m.email}` : "PayPal returned neither payer ID nor email",
      });
    });
    const res = NextResponse.redirect(back(`order=${orderId}`));
    res.cookies.delete("rc_login_state");
    return res;
  } catch (e) {
    return NextResponse.redirect(back(`error=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 200) : "login failed")}`));
  }
}
