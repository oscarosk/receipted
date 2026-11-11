"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({ orderId, productHref }: { orderId: string; productHref: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setErr("Pick a star rating");
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, rating, title, body }),
    });
    const j = (await res.json().catch(() => ({ error: `HTTP ${res.status}` }))) as { review?: { id: string }; error?: string };
    if (j.review) router.push(`/proof/${j.review.id}?new=1`);
    else {
      setErr(j.error ?? "Could not save");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-1 text-3xl" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={n <= rating ? "text-amber-500" : "text-zinc-300 hover:text-amber-300"}
          >
            ★
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={120} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What was it like to use?" rows={5} maxLength={2000} className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
      {err && <p className="text-sm text-rose-700">{err}</p>}
      <div className="flex items-center gap-4">
        <button disabled={busy} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Screening and signing…" : "Post proven review"}
        </button>
        <a href={productHref} className="text-sm text-zinc-500 underline">
          Cancel
        </a>
      </div>
    </form>
  );
}
