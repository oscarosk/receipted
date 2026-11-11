import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { STORES } from "@/lib/catalog";
import { proofBundle, toPublic } from "@/lib/reviews";
import { getCapture } from "@/lib/paypal";
import { ReviewCard, Shell } from "@/components/ui";

async function ProofView(props: PageProps<"/proof/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  await connection();
  const b = await proofBundle(id);
  if (!b) return <Shell><p>No such review.</p></Shell>;
  let live = "unavailable";
  if (b.order?.captureId) {
    try {
      live = (await getCapture(b.order.captureId)).status;
    } catch {
      live = "unavailable";
    }
  }
  const status = b.review.proof?.status;
  return (
    <Shell store={STORES[b.review.store]}>
      <div className="max-w-2xl space-y-6">
        {sp.new && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Your review is live with a signed PayPal proof.</p>}
        <h1 className="text-2xl font-semibold">
          {status === "proven" ? "✓ Proven by PayPal" : status === "revoked" ? "Proof revoked" : "No PayPal proof"}
        </h1>
        <ReviewCard r={toPublic(b.review)} />
        {b.payload ? (
          <>
            <ul className="space-y-1 text-sm">
              <li>{b.review.matchedOn === "payer_id" ? "✓ Same PayPal account ID as the payer" : "✓ Same PayPal account (email) as the payer"}</li>
              <li>✓ Payment captured: ${b.payload.amount} on {new Date(b.payload.paid_at).toLocaleDateString("en-US")}</li>
              <li>{b.payload.checks.refunded ? "✗ Refunded" : "✓ Not refunded"}</li>
              <li>{b.payload.checks.disputed ? "✗ Disputed" : "✓ No open dispute"}</li>
              <li>PayPal right now says this capture is: <b>{live}</b></li>
              <li>{b.valid ? "✓ Ed25519 signature valid" : "✗ Signature invalid"}</li>
            </ul>
            <details className="rounded-lg border border-zinc-200 bg-white p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium">Signed proof (for agents and other sites)</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify({ payload: b.payload, signature: b.signature }, null, 2)}</pre>
              <p className="mt-2">
                JSON: <Link className="underline" href={`/api/proof/${id}`}>/api/proof/{id}</Link> · Key:{" "}
                <Link className="underline" href="/.well-known/receipted-key.json">/.well-known/receipted-key.json</Link>
              </p>
            </details>
          </>
        ) : (
          <p className="text-sm text-zinc-600">This review isn&apos;t tied to any PayPal payment, so nothing proves the author bought the product.</p>
        )}
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
