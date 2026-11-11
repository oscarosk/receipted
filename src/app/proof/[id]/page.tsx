import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { proofBundle, toPublic } from "@/lib/reviews";
import { getCapture } from "@/lib/paypal";
import { Receipt, ReviewCard, Shell, type ReceiptLine } from "@/components/ui";

async function ProofView(props: PageProps<"/proof/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  await connection();
  const b = await proofBundle(id);
  if (!b) return <Shell><p>There is no review with this ID.</p></Shell>;
  let live = "unavailable";
  if (b.order?.captureId) {
    try {
      live = (await getCapture(b.order.captureId)).status;
    } catch {
      live = "unavailable";
    }
  }
  const status = b.review.proof?.status ?? "none";
  const lines: ReceiptLine[] = b.payload
    ? [
        { k: "Item", v: b.product?.name ?? b.review.productId },
        { k: "Paid", v: `$${b.payload.amount} ${b.payload.currency}` },
        { k: "Date", v: new Date(b.payload.paid_at).toLocaleDateString("en-US", { dateStyle: "medium" }) },
        { k: "Reviewer is payer", v: b.review.matchedOn === "payer_id" ? "yes, account ID" : "yes, account email" },
        { k: "Refunded", v: b.payload.checks.refunded ? "yes" : "no", bad: b.payload.checks.refunded },
        { k: "Disputed", v: b.payload.checks.disputed ? "yes" : "no", bad: b.payload.checks.disputed },
        { k: "PayPal says now", v: live, bad: live !== "COMPLETED" },
        { k: "Signature", v: b.valid ? "valid (Ed25519)" : "INVALID", bad: !b.valid },
      ]
    : [
        { k: "Item", v: b.product?.name ?? b.review.productId },
        { k: "PayPal payment", v: "none found", bad: true },
      ];
  return (
    <Shell theme={b.review.store}>
      {sp.new && <p className="mb-6 border-l-4 border-proof bg-white p-3 text-sm">Your review is published with a signed PayPal proof.</p>}
      <div className="grid gap-10 md:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-serif text-3xl">
            {status === "proven" ? "This review is proven by PayPal" : status === "revoked" ? "This review's proof was revoked" : "This review has no proof of purchase"}
          </h1>
          <p className="mt-2 max-w-prose text-ink/65">
            {status === "proven"
              ? "The PayPal account that wrote it is the account that paid, the payment went through, and it hasn't been refunded or disputed."
              : status === "revoked"
                ? `PayPal reported the order as ${b.order?.status}. The review stays visible, but it no longer counts.`
                : "Nothing ties this review to a payment, so nothing shows the author bought the product."}
          </p>
          <div className="mt-6">
            <ReviewCard r={toPublic(b.review)} theme={b.review.store === "megaboom" ? "megaboom" : "quiet-hour"} />
          </div>
          {b.payload && (
            <details className="mt-6 text-sm">
              <summary className="cursor-pointer font-medium">Signed proof data, for agents and other sites</summary>
              <pre className="mt-3 overflow-x-auto rounded-sm bg-ink p-4 font-mono text-xs leading-5 text-[#cfe9de]">
                {JSON.stringify({ payload: b.payload, signature: b.signature }, null, 2)}
              </pre>
              <p className="mt-2 text-ink/60">
                Fetch it as JSON at <Link className="underline" href={`/api/proof/${id}`}>/api/proof/{id}</Link> and check it with the public key at{" "}
                <Link className="underline" href="/.well-known/receipted-key.json">/.well-known/receipted-key.json</Link>.
              </p>
            </details>
          )}
        </div>
        <Receipt status={status} lines={lines} animate footer={<span className="break-all">Review {b.review.id}</span>} />
      </div>
    </Shell>
  );
}

export default function Page(props: PageProps<"/proof/[id]">) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
      <ProofView {...props} />
    </Suspense>
  );
}
