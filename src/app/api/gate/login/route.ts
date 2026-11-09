import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { loginUrl } from "@/lib/paypal";
import { baseUrl } from "@/lib/baseUrl";

// Step 3: the reviewer signs in with PayPal. The state value ties the callback to this
// order and is checked against a cookie so it can't be forged by another site.
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("order");
  const base = baseUrl(req);
  if (!orderId) return NextResponse.redirect(`${base}/gate?error=missing-order`);
  const nonce = randomBytes(16).toString("hex");
  const state = `${orderId}.${nonce}`;
  const res = NextResponse.redirect(loginUrl(`${base}/api/auth/paypal/callback`, state));
  res.cookies.set("rc_login_state", state, { httpOnly: true, sameSite: "lax", secure: base.startsWith("https"), maxAge: 600, path: "/" });
  return res;
}
