import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { product, STORES } from "@/lib/catalog";
import { reviewsFor, summarise, toPublic } from "@/lib/reviews";
import { ReviewCard, Shell, Stars } from "@/components/ui";
import { ProductArt } from "@/components/art";
import BuyButton from "./BuyButton";

async function ProductView({ params }: { params: Promise<{ store: string; product: string }> }) {
  const { product: pid } = await params;
  const p = product(pid);
  if (!p) notFound();
  const store = STORES[p.store];
  const loud = !store.usesReceipted;
  await connection();
  const all = await reviewsFor(p.id);
  const s = summarise(all);
  const proven = all.filter((r) => r.proof?.status === "proven");
  const revoked = all.filter((r) => r.proof?.status === "revoked");
  return (
    <Shell theme={store.id}>
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className={`aspect-[6/5] overflow-hidden ${loud ? "ring-4 ring-ink" : "rounded-sm"}`}>
          <ProductArt id={p.id} />
        </div>
        <div>
          <h1 className={loud ? "font-loud text-4xl italic leading-none" : "font-serif text-3xl leading-tight"}>{p.name}</h1>
          <p className={`mt-3 ${loud ? "font-bold" : "text-ink/70"}`}>{p.blurb}</p>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold">${p.price}</span>
            {loud && <span className="text-ink/45 line-through">$199.00</span>}
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {loud ? (
              <>
                <Stars n={s.avgAll ?? 0} /> <span className="font-bold">{s.avgAll}</span>
                <span className="text-ink/60">({s.total.toLocaleString()} reviews)</span>
              </>
            ) : s.proven ? (
              <>
                <Stars n={s.avgProven ?? 0} /> <span>{s.avgProven}</span>
                <span className="text-ink/60">
                  from {s.proven} review{s.proven > 1 ? "s" : ""} proven by PayPal
                </span>
              </>
            ) : (
              <span className="text-ink/60">No proven reviews yet</span>
            )}
          </div>
          <ul className="mt-5 space-y-1 text-sm text-ink/75">
            {p.specs.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className="mt-7">
            {loud ? (
              <p className="text-sm text-ink/60">Checkout is turned off on this demo store.</p>
            ) : (
              <BuyButton productId={p.id} label="Pay with PayPal" />
            )}
          </div>
        </div>
      </div>

      <section className="mt-14 max-w-3xl">
        {loud ? (
          <>
            <h2 className="font-loud text-2xl italic">CUSTOMER REVIEWS ({s.total.toLocaleString()})</h2>
            <div className="mt-2">
              {all.slice(0, 25).map((r) => (
                <ReviewCard key={r.id} r={toPublic(r)} theme="megaboom" />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl">Reviews</h2>
            <p className="mt-1 text-sm text-ink/60">
              Only the PayPal account that paid for an order can review it. If the payment is refunded, reversed or disputed, the proof comes off.
            </p>
            <div className="mt-4">
              {proven.length === 0 && revoked.length === 0 && <p className="py-6 text-ink/60">Nobody has reviewed this yet. Buy it and yours will be the first proven review.</p>}
              {[...proven, ...revoked].map((r) => (
                <ReviewCard key={r.id} r={toPublic(r)} />
              ))}
            </div>
          </>
        )}
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
