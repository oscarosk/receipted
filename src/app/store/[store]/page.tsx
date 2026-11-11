import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { productsOf, STORES, type StoreId } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { summarise } from "@/lib/reviews";
import { Shell, Stars } from "@/components/ui";
import { ProductArt } from "@/components/art";

async function StoreView({ params }: { params: Promise<{ store: string }> }) {
  const { store: id } = await params;
  const store = STORES[id as StoreId];
  if (!store) notFound();
  await connection();
  const db = await readDb();
  const loud = store.id === "megaboom";
  return (
    <Shell theme={store.id}>
      <p className={loud ? "font-loud text-4xl italic text-boom" : "max-w-xl font-serif text-3xl leading-snug"}>
        {loud ? "THE #1 RATED HEADPHONES ON THE INTERNET!!!" : "Headphones for people who like quiet. Every review here is from someone PayPal says paid."}
      </p>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {productsOf(store.id).map((p) => {
          const s = summarise(db.reviews.filter((r) => r.productId === p.id));
          return (
            <Link key={p.id} href={`/store/${store.id}/${p.id}`} className="group block">
              <div className={`aspect-[6/5] overflow-hidden ${loud ? "rounded-none ring-4 ring-ink" : "rounded-sm"}`}>
                <ProductArt id={p.id} />
              </div>
              <h2 className={`mt-3 ${loud ? "font-bold uppercase" : "font-serif text-lg"} group-hover:underline`}>{p.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="font-semibold">${p.price}</span>
                {s.total > 0 && <Stars n={store.usesReceipted ? (s.avgProven ?? 0) : (s.avgAll ?? 0)} size="text-xs" />}
                <span className="text-ink/55">
                  {store.usesReceipted ? (s.proven ? `${s.proven} proven review${s.proven > 1 ? "s" : ""}` : "No reviews yet") : `${s.total.toLocaleString()} reviews`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Shell>
  );
}

export default function Page(props: PageProps<"/store/[store]">) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <StoreView params={props.params} />
    </Suspense>
  );
}
