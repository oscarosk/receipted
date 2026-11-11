import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { product } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { Shell } from "@/components/ui";

async function OrderView(props: PageProps<"/orders/[orderId]">) {
  const { orderId } = await props.params;
  const sp = await props.searchParams;
  await connection();
  const db = await readDb();
  const o = db.orders.find((x) => x.orderId === orderId);
  const p = o && product(o.productId);
  const reviewed = db.reviews.some((r) => r.orderId === orderId);
  return (
    <Shell theme={o?.store ?? "receipted"}>
      {sp.error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{String(sp.error)}</p>}
      {!o || !p ? (
        <p>Order not found.</p>
      ) : (
        <div className="max-w-xl space-y-4">
          <h1 className="font-serif text-3xl">{o.status === "paid" ? "Thanks, you're all set" : `Order ${o.status}`}</h1>
          <p className="text-zinc-600">
            {p.name} · ${o.amount} · paid with PayPal{o.payerName ? ` by ${o.payerName}` : ""}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-zinc-500">PayPal order</dt>
            <dd className="font-mono">{o.orderId}</dd>
            <dt className="text-zinc-500">Capture</dt>
            <dd className="font-mono">{o.captureId ?? "–"}</dd>
          </dl>
          {o.status === "paid" && !reviewed && (
            <div className="rounded-sm border-l-4 border-proof bg-white p-5">
              <p className="text-sm text-ink/75">
                In a real store this link arrives by email after delivery. Only the PayPal account that paid can use it.
              </p>
              <Link href={`/review/${o.orderId}`} className="mt-3 inline-block rounded-md bg-proof px-4 py-2 text-sm font-semibold text-white">
                Write a proven review
              </Link>
            </div>
          )}
          {reviewed && (
            <Link href={`/store/${o.store}/${o.productId}`} className="text-sm underline">
              See your review on the product page
            </Link>
          )}
        </div>
      )}
    </Shell>
  );
}

export default function Page(props: PageProps<"/orders/[orderId]">) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <OrderView {...props} />
    </Suspense>
  );
}
