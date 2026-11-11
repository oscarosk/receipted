import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createProvenReview, toPublic } from "@/lib/reviews";
import { decodeGrant, REVIEWER_COOKIE } from "@/lib/session";

const Body = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(10).max(2000),
});

// Only a browser holding a PayPal-confirmed grant for this exact order can post its review.
export async function POST(req: NextRequest) {
  try {
    const input = Body.parse(await req.json());
    const grant = decodeGrant(req.cookies.get(REVIEWER_COOKIE)?.value);
    if (!grant || grant.orderId !== input.orderId) {
      return NextResponse.json({ error: "Sign in with the PayPal account that paid for this order first" }, { status: 403 });
    }
    const review = await createProvenReview({ ...input, matchedOn: grant.matchedOn, author: grant.name });
    const res = NextResponse.json({ review: toPublic(review) });
    res.cookies.delete(REVIEWER_COOKIE);
    return res;
  } catch (e) {
    const msg = e instanceof z.ZodError ? "Please add a rating, a title and at least a sentence" : e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
