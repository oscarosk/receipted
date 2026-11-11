import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { loginUrl } from "@/lib/paypal";
import { baseUrl } from "@/lib/baseUrl";

// Starts Log in with PayPal for a review. "r." marks the review flow in the shared callback.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const orderId = new URL(req.url).searchParams.get("order");
  if (!orderId) return NextResponse.redirect(`${base}/store/quiet-hour`);
  const state = `r.${orderId}.${randomBytes(16).toString("hex")}`;
  try {
    const res = NextResponse.redirect(loginUrl(`${base}/api/auth/paypal/callback`, state));
    res.cookies.set("rc_login_state", state, { httpOnly: true, sameSite: "lax", secure: base.startsWith("https"), maxAge: 600, path: "/" });
    return res;
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : "login failed");
    return NextResponse.redirect(`${base}/review/${orderId}?error=${msg}`);
  }
}
