import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { productsOf, STORES, type StoreId } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { summarise } from "@/lib/reviews";
import { Shell, Stars } from "@/components/ui";

async function StoreView({ params }: { params: Promise<{ store: string }> }) {
  const { store: id } = await params;
  const store = STORES[id as StoreId];
  if (!store) notFound();
  await connection();
  const db = await readDb();
  return (
    <Shell store={store}>
      <h1 className="text-2xl font-semibold">{store.name}</h1>
      <p className="mt-1 text-zinc-600">{store.tagline}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {productsOf(store.id).map((p) => {
          const s = summarise(db.reviews.filter((r) => r.productId === p.id));
          return (
            <Link key={p.id} href={`/store/${store.id}/${p.id}`} className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400">
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-zinc-100 text-4xl" aria-hidden>
                🎧
              </div>
              <h2 className="mt-3 font-medium">{p.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="font-semibold">${p.price}</span>
                {s.total > 0 && (
                  <>
                    <Stars n={store.usesReceipted ? (s.avgProven ?? 0) : (s.avgAll ?? 0)} size="text-xs" />
                    <span className="text-zinc-500">
                      {store.usesReceipted ? `${s.proven} proven` : `${s.total.toLocaleString()} reviews`}
                    </span>
                  </>
                )}
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
