import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { product, STORES } from "@/lib/catalog";
import { reviewsFor, summarise, toPublic } from "@/lib/reviews";
import { ReviewCard, Shell, Stars } from "@/components/ui";
import BuyButton from "./BuyButton";

async function ProductView({ params }: { params: Promise<{ store: string; product: string }> }) {
  const { product: pid } = await params;
  const p = product(pid);
  if (!p) notFound();
  const store = STORES[p.store];
  await connection();
  const all = await reviewsFor(p.id);
  const s = summarise(all);
  // Receipted stores lead with proven reviews; revoked ones stay visible but marked.
  const shown = store.usesReceipted
    ? [...all].sort((a, b) => Number(b.proof?.status === "proven") - Number(a.proof?.status === "proven"))
    : all.slice(0, 30);
  return (
    <Shell store={store}>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-zinc-100 text-8xl" aria-hidden>
          🎧
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="mt-2 text-zinc-600">{p.blurb}</p>
          <p className="mt-4 text-2xl font-semibold">${p.price}</p>
          {store.usesReceipted ? (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Stars n={s.avgProven ?? 0} /> <span>{s.avgProven ?? "–"}</span>
              <span className="text-zinc-500">from {s.proven} reviews proven by PayPal</span>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Stars n={s.avgAll ?? 0} /> <span>{s.avgAll ?? "–"}</span>
              <span className="text-zinc-500">{s.total.toLocaleString()} reviews · none proven</span>
            </div>
          )}
          <ul className="mt-4 list-disc pl-5 text-sm text-zinc-700">
            {p.specs.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="mt-6">
            {store.usesReceipted ? (
              <BuyButton productId={p.id} label="Buy with PayPal (sandbox)" />
            ) : (
              <p className="text-sm text-zinc-500">Checkout disabled on the demo fake-review store.</p>
            )}
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {store.usesReceipted && (
          <p className="mt-1 text-sm text-zinc-500">
            Only the PayPal account that paid can review an order. A refund, reversal or dispute removes the proof automatically.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {shown.length === 0 && <p className="text-sm text-zinc-500">No reviews yet. Buy it and be the first proven review.</p>}
          {shown.map((r) => (
            <ReviewCard key={r.id} r={toPublic(r)} />
          ))}
        </div>
      </section>
    </Shell>
  );
}

export default function Page(props: PageProps<"/store/[store]/[product]">) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <ProductView params={props.params} />
    </Suspense>
  );
}
