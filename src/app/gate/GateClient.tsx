"use client";

import { useCallback, useEffect, useState } from "react";
import type { GateCheck, GateEvent, GateOrder } from "@/lib/gateStore";

type State = { orders: GateOrder[]; checks: GateCheck[]; events: GateEvent[] };

function Step({ n, title, ok, children }: { n: number; title: string; ok?: boolean; children: React.ReactNode }) {
  const badge = ok === undefined ? "bg-zinc-200 text-zinc-700" : ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800";
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${badge}`}>{n}</span>
        <h2 className="font-semibold">{title}</h2>
        {ok !== undefined && <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>{ok ? "pass" : "fail"}</span>}
      </div>
      <div className="space-y-2 text-sm text-zinc-700">{children}</div>
    </section>
  );
}

export default function GateClient({ initialOrderId, initialError }: { initialOrderId: string | null; initialError: string | null }) {
  const [state, setState] = useState<State>({ orders: [], checks: [], events: [] });
  const orderId = initialOrderId;
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/gate/state", { cache: "no-store" });
    setState(await res.json());
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 3000);
    const first = setTimeout(refresh, 0);
    return () => {
      clearInterval(t);
      clearTimeout(first);
    };
  }, [refresh]);

  const order = state.orders.find((o) => o.orderId === orderId) ?? state.orders[0];
  const checks = state.checks.filter((c) => c.orderId === order?.orderId);
  const sameBuyer = checks.find((c) => c.matches);
  const otherBuyer = checks.find((c) => !c.matches);
  const refundEvent = state.events.find((e) => e.verified && e.captureId && e.captureId === order?.captureId);

  async function buy() {
    setBusy(true);
    const res = await fetch("/api/gate/order", { method: "POST" });
    const json = await res.json();
    if (json.approveUrl) window.location.href = json.approveUrl;
    else {
      setError(JSON.stringify(json).slice(0, 300));
      setBusy(false);
    }
  }

  async function refund() {
    if (!order) return;
    setBusy(true);
    const res = await fetch("/api/gate/refund", { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
    if (!res.ok) setError(await res.text());
    setBusy(false);
    refresh();
  }

  const btn = "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40";

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Receipted day-1 gate</h1>
        <p className="text-sm text-zinc-600">
          Proves the core claim in the PayPal sandbox: a review can be tied to the exact PayPal account that paid, and a refund is
          reported back by a verified webhook.
        </p>
      </header>

      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Error: {error}</p>}

      <Step n={1} title="Buy with a sandbox personal account" ok={order?.captureId ? true : undefined}>
        <button className={btn} disabled={busy} onClick={buy}>
          Buy QH-1 headphones ($79, sandbox)
        </button>
        {order && (
          <p>
            Order <code>{order.orderId}</code> · status <b>{order.status}</b>
            {order.payerId && (
              <>
                {" "}
                · payer ID <code>{order.payerId}</code>
              </>
            )}
            {order.captureId && (
              <>
                {" "}
                · capture <code>{order.captureId}</code>
              </>
            )}
          </p>
        )}
      </Step>

      <Step n={2} title="Log in with PayPal as the SAME account" ok={sameBuyer ? true : checks.length ? false : undefined}>
        <a className={btn} aria-disabled={!order?.captureId} href={order?.captureId ? `/api/gate/login?order=${order.orderId}` : undefined}>
          Log in with PayPal to review
        </a>
        {checks.map((c) => (
          <p key={c.at}>
            {c.matches ? "Match" : "No match"}: reviewer payer ID <code>{c.reviewerPayerId ?? "none"}</code>, verified account{" "}
            <b>{String(c.verifiedAccount)}</b>
            {c.note && <span className="text-rose-700"> ({c.note})</span>}
          </p>
        ))}
      </Step>

      <Step n={3} title="Log in with a DIFFERENT account: must be refused" ok={otherBuyer ? true : undefined}>
        <p>Repeat step 2 but sign in with another sandbox personal account. A &ldquo;No match&rdquo; line means the check works.</p>
      </Step>

      <Step n={4} title="Refund: verified webhook flips the proof" ok={refundEvent ? true : undefined}>
        <button className={btn} disabled={busy || !order?.captureId || order?.refunded} onClick={refund}>
          Refund this order
        </button>
        <p>
          Proof status: <b>{order?.refunded ? "Refunded (proof removed)" : order?.captureId ? "Paid and not refunded" : "-"}</b>
        </p>
        {state.events.slice(0, 5).map((e) => (
          <p key={e.id} className="text-xs">
            {e.type} · {e.verified ? "verified" : "NOT verified"} · capture {e.captureId ?? "-"}
          </p>
        ))}
      </Step>
    </main>
  );
}
