"use client";
import { useState } from "react";

export default function BuyButton({ productId, label }: { productId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function buy() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
    const j = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { approveUrl?: string; error?: string };
    if (j.approveUrl) window.location.href = j.approveUrl;
    else {
      setErr(j.error ?? "Could not start checkout");
      setBusy(false);
    }
  }
  return (
    <div>
      <button onClick={buy} disabled={busy} className="rounded-full bg-[#ffc439] px-6 py-2.5 font-semibold text-zinc-900 hover:brightness-95 disabled:opacity-60">
        {busy ? "Opening PayPal…" : label}
      </button>
      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
    </div>
  );
}
