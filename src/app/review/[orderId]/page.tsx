import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { product, STORES } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { decodeGrant, REVIEWER_COOKIE } from "@/lib/session";
import { Shell } from "@/components/ui";
import ReviewForm from "./ReviewForm";

async function ReviewView(props: PageProps<"/review/[orderId]">) {
  const { orderId } = await props.params;
  const sp = await props.searchParams;
  await connection();
  const db = await readDb();
  const o = db.orders.find((x) => x.orderId === orderId);
  const p = o && product(o.productId);
  const grant = decodeGrant((await cookies()).get(REVIEWER_COOKIE)?.value);
  const existing = db.reviews.find((r) => r.orderId === orderId);
  if (!o || !p) return <Shell><p>Order not found.</p></Shell>;
  return (
    <Shell store={STORES[o.store]}>
      <div className="max-w-xl">
        <h1 className="text-2xl font-semibold">Review {p.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">Order {o.orderId}</p>
        {sp.error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{String(sp.error)}</p>}
        {existing ? (
          <p className="mt-6">
            This order already has a review.{" "}
            <Link className="underline" href={`/proof/${existing.id}`}>
              See its proof
            </Link>
          </p>
        ) : o.status !== "paid" ? (
          <p className="mt-6 text-zinc-700">This order is {o.status}, so it can&apos;t carry a proven review.</p>
        ) : grant?.orderId === orderId ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              ✓ PayPal confirmed you&apos;re the account that paid for this order ({grant.matchedOn === "payer_id" ? "PayPal account ID" : "PayPal account email"} matched).
            </p>
            <ReviewForm orderId={orderId} productHref={`/store/${o.store}/${o.productId}`} />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-zinc-700">
              To keep reviews honest, sign in with the PayPal account you paid with. Receipted only checks that it&apos;s the same account; it
              never sees your card or bank details.
            </p>
            <a href={`/api/review/login?order=${orderId}`} className="inline-block rounded-full bg-[#0070e0] px-5 py-2.5 text-sm font-semibold text-white">
              Log in with PayPal to review
            </a>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function Page(props: PageProps<"/review/[orderId]">) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <ReviewView {...props} />
    </Suspense>
  );
}
