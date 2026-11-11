import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { readDb } from "@/lib/db";
import { product } from "@/lib/catalog";
import { Receipt, Shell } from "@/components/ui";

async function LatestProof() {
  await connection();
  const db = await readDb();
  const r = db.reviews.find((x) => x.proof?.status === "proven");
  const o = r && db.orders.find((x) => x.orderId === r.orderId);
  if (!r || !o) {
    return (
      <Receipt
        status="proven"
        title="Example proof"
        lines={[
          { k: "Item", v: "QH-1 Over-Ear" },
          { k: "Paid", v: "$79.00 USD" },
          { k: "Reviewer is payer", v: "yes" },
          { k: "Refunded", v: "no" },
          { k: "Disputed", v: "no" },
          { k: "Signature", v: "valid (Ed25519)" },
        ]}
        footer="No proven reviews yet. Buy something to make the first one."
      />
    );
  }
  return (
    <Link href={`/proof/${r.id}`} className="block">
      <Receipt
        status="proven"
        title="Latest proof"
        animate
        lines={[
          { k: "Item", v: product(r.productId)?.name ?? r.productId },
          { k: "Paid", v: `$${o.amount} USD` },
          { k: "Reviewer is payer", v: "yes" },
          { k: "Refunded", v: "no" },
          { k: "Rating", v: "★".repeat(r.rating) },
        ]}
        footer={`“${r.title}”`}
      />
    </Link>
  );
}

const steps = [
  { t: "Someone buys with PayPal", d: "The store captures the payment and Receipted notes which PayPal account paid." },
  { t: "They sign in with PayPal to review", d: "If it isn't the same account that paid, the review is refused." },
  { t: "The review gets a signed proof", d: "Shoppers see a badge. Agents get the proof over MCP and can check the signature themselves." },
  { t: "Money goes back, the proof comes off", d: "A refund, reversal or dispute arrives as a verified PayPal webhook and revokes the proof within seconds." },
];

const places = [
  { href: "/store/quiet-hour/qh-1", t: "Quiet Hour Audio", d: "The store using Receipted. Buy with a sandbox account and leave a proven review." },
  { href: "/store/megaboom/mb-x1", t: "MegaBoom Sound", d: "400 five-star reviews, none tied to a payment, two with hidden instructions for AI agents." },
  { href: "/agent", t: "Agent demo", d: "The same AI shopping agent answers the same question with and without Receipted." },
  { href: "/console", t: "Merchant console", d: "Every review, its proof and the screener's notes, with refunds you can trigger." },
];

export default function Home() {
  return (
    <Shell>
      <section className="grid items-center gap-12 md:grid-cols-[1.3fr_1fr]">
        <div>
          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-tight">A review should come with a receipt.</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/70">
            Receipted counts a review only when PayPal shows that the person writing it paid for the order, and nothing has been refunded or
            disputed. People see the proof. AI shopping agents can verify it, and never read text planted to steer them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/store/quiet-hour/qh-1" className="rounded-md bg-ink px-5 py-3 font-semibold text-white">
              Try the store
            </Link>
            <Link href="/agent" className="rounded-md px-5 py-3 font-semibold ring-1 ring-ink/25 hover:ring-ink/50">
              Watch two agents shop
            </Link>
          </div>
        </div>
        <Suspense fallback={<div className="h-72" />}>
          <LatestProof />
        </Suspense>
      </section>

      <section className="mt-20 grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">How a review gets proven</h2>
          <ol className="mt-5 space-y-5">
            {steps.map((s, i) => (
              <li key={s.t} className="grid grid-cols-[2rem_1fr]">
                <span className="font-mono text-ink/40">{i + 1}</span>
                <div>
                  <div className="font-medium">{s.t}</div>
                  <p className="text-sm leading-relaxed text-ink/65">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Look around</h2>
          <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
            {places.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="block py-4 hover:bg-white/60">
                  <div className="font-medium underline-offset-4 hover:underline">{p.t}</div>
                  <p className="text-sm text-ink/65">{p.d}</p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink/55">
            Agents connect over MCP at <code className="font-mono">/api/mcp</code> or read <code className="font-mono">/api/agent/feed</code>.
          </p>
        </div>
      </section>
    </Shell>
  );
}
