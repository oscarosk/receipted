import Link from "next/link";
import type { PublicReview } from "@/lib/reviews";

export function Stars({ n, size = "text-base" }: { n: number; size?: string }) {
  return (
    <span className={`${size} tracking-tight text-amber-500`} aria-label={`${n} out of 5 stars`}>
      {"★".repeat(Math.round(n))}
      <span className="text-zinc-300">{"★".repeat(5 - Math.round(n))}</span>
    </span>
  );
}

export function ProofBadge({ status, href }: { status: PublicReview["proofStatus"]; href?: string }) {
  if (status === "proven")
    return (
      <Link href={href ?? "#"} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
        <span aria-hidden>✓</span> Proven by PayPal
      </Link>
    );
  if (status === "revoked")
    return (
      <Link href={href ?? "#"} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-200">
        Proof revoked
      </Link>
    );
  return <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">Unproven</span>;
}

export function ReviewCard({ r }: { r: PublicReview }) {
  return (
    <article className={`rounded-xl border bg-white p-4 ${r.proofStatus === "revoked" ? "border-rose-200 opacity-70" : "border-zinc-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Stars n={r.rating} size="text-sm" />
        <h3 className="font-medium">{r.title}</h3>
        <span className="ml-auto">
          <ProofBadge status={r.proofStatus} href={r.proofUrl} />
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.body}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-500">
        <span>{r.author}</span>
        <span>·</span>
        <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
        {r.flags.length > 0 && (
          <span className="rounded bg-amber-50 px-1.5 text-amber-800 ring-1 ring-amber-200">AI screener: {r.flags.join("; ")}</span>
        )}
      </div>
    </article>
  );
}

export function Shell({ children, store }: { children: React.ReactNode; store?: { name: string; usesReceipted: boolean } }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-sm">
          <Link href="/" className="font-semibold">
            Receipted
          </Link>
          {store && <span className="text-zinc-400">/</span>}
          {store && <span className="font-medium">{store.name}</span>}
          {store && !store.usesReceipted && <span className="rounded bg-orange-100 px-1.5 text-xs text-orange-800">demo fake-review store</span>}
          <nav className="ml-auto flex gap-4 text-zinc-600">
            <Link href="/store/quiet-hour">Quiet Hour</Link>
            <Link href="/store/megaboom">MegaBoom</Link>
            <Link href="/agent">Agent demo</Link>
            <Link href="/console">Console</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-zinc-400">
        Fictional stores. PayPal sandbox only; no real money moves.
      </footer>
    </div>
  );
}
