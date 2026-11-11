import Link from "next/link";
import type { PublicReview } from "@/lib/reviews";

export type Theme = "receipted" | "quiet-hour" | "megaboom";

export function Stars({ n, size = "text-base" }: { n: number; size?: string }) {
  const k = Math.round(n);
  return (
    <span className={`${size} whitespace-nowrap text-amber-500`} aria-label={`${n} out of 5 stars`}>
      {"★".repeat(k)}
      <span className="text-zinc-300" aria-hidden>
        {"★".repeat(5 - k)}
      </span>
    </span>
  );
}

export function ProofBadge({ status, href }: { status: PublicReview["proofStatus"]; href?: string }) {
  if (status === "proven")
    return (
      <Link
        href={href ?? "#"}
        className="inline-flex items-center gap-1.5 rounded-md bg-proof-soft px-2 py-1 text-xs font-semibold text-proof hover:bg-[#d3ebe1]"
      >
        <Tick /> Proven by PayPal
      </Link>
    );
  if (status === "revoked")
    return (
      <Link href={href ?? "#"} className="inline-flex items-center gap-1.5 rounded-md bg-void-soft px-2 py-1 text-xs font-semibold text-void">
        Proof revoked
      </Link>
    );
  return <span className="inline-flex rounded-md px-2 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200">No proof of purchase</span>;
}

function Tick() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
      <path d="M2 6.5 L5 9 L10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReviewCard({ r, theme = "quiet-hour" }: { r: PublicReview; theme?: Theme }) {
  const date = new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (theme === "megaboom")
    return (
      <article className="border-b border-orange-200 py-4">
        <div className="flex items-center gap-2">
          <Stars n={r.rating} size="text-sm" />
          <h3 className="font-bold">{r.title}</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-700">{r.body}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {r.author}, {date}
        </p>
      </article>
    );
  return (
    <article className={`border-t border-ink/10 py-5 ${r.proofStatus === "revoked" ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Stars n={r.rating} size="text-sm" />
        <h3 className="font-serif text-lg">{r.title}</h3>
        <span className="ml-auto">
          <ProofBadge status={r.proofStatus} href={r.proofUrl} />
        </span>
      </div>
      <p className={`mt-2 max-w-prose leading-relaxed text-ink/80 ${r.proofStatus === "revoked" ? "line-through decoration-void/40" : ""}`}>{r.body}</p>
      <p className="mt-2 text-sm text-ink/55">
        {r.author}, {date}
      </p>
      {r.flags.length > 0 && <p className="mt-2 text-xs text-amber-800">Screener note: {r.flags.join("; ")}</p>}
    </article>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 20 24" className="h-5 w-[18px]" aria-hidden>
      <path d="M2 1 h16 v20 l-2.7 -2 l-2.6 2 l-2.7 -2 l-2.7 2 l-2.6 -2 l-2.7 2z" fill="currentColor" />
      <path d="M6 10.5 l2.6 2.5 l5.4 -6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { href: "/store/quiet-hour", t: "Quiet Hour" },
  { href: "/store/megaboom", t: "MegaBoom" },
  { href: "/agent", t: "Agent demo" },
  { href: "/console", t: "Console" },
];

export function Shell({ children, theme = "receipted", wide = false }: { children: React.ReactNode; theme?: Theme; wide?: boolean }) {
  const bg = theme === "megaboom" ? "bg-[#fff8f0]" : theme === "quiet-hour" ? "bg-[#f6f8f7]" : "bg-page";
  const width = wide ? "max-w-6xl" : "max-w-5xl";
  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="bg-ink text-white">
        <div className={`mx-auto flex ${width} items-center gap-5 px-6 py-2.5 text-sm`}>
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-[#7fd3b0]">
              <Mark />
            </span>
            Receipted
          </Link>
          <nav className="ml-auto flex gap-4 text-white/70">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-white">
                {n.t}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {theme === "quiet-hour" && (
        <div className="border-b border-ink/10 bg-white">
          <div className={`mx-auto flex ${width} items-baseline gap-3 px-6 py-4`}>
            <Link href="/store/quiet-hour" className="font-serif text-2xl tracking-tight">
              Quiet Hour Audio
            </Link>
            <span className="text-sm text-ink/50">Small-batch headphones</span>
          </div>
        </div>
      )}
      {theme === "megaboom" && (
        <div className="bg-boom text-white">
          <div className={`mx-auto flex ${width} items-center gap-3 px-6 py-3`}>
            <Link href="/store/megaboom" className="font-loud text-3xl italic tracking-wide">
              MEGABOOM SOUND
            </Link>
            <span className="ml-auto rounded bg-boom-yellow px-2 py-0.5 text-sm font-bold text-ink">Flash sale ends in 09:59</span>
          </div>
        </div>
      )}
      <main className={`mx-auto ${width} px-6 py-10`}>{children}</main>
      <footer className={`mx-auto ${width} px-6 pb-10 text-xs text-ink/45`}>
        Quiet Hour Audio and MegaBoom Sound are fictional demo stores. PayPal sandbox only; no real money moves.
      </footer>
    </div>
  );
}

export type ReceiptLine = { k: string; v: string; bad?: boolean };

/** A proof printed like a till receipt, stamped PROVEN or REVOKED. */
export function Receipt({
  status,
  lines,
  footer,
  title = "Proof of purchase",
  animate = false,
}: {
  status: "proven" | "revoked" | "none";
  lines: ReceiptLine[];
  footer?: React.ReactNode;
  title?: string;
  animate?: boolean;
}) {
  return (
    <div className="relative">
      <div className="receipt text-[13px] leading-6">
        <div className="text-center">
          <div className="font-sans text-sm font-semibold">Receipted</div>
          <div className="text-ink/60">{title}</div>
        </div>
        <div className="receipt-rule my-3" />
        <dl>
          {lines.map((l) => (
            <div key={l.k} className="flex justify-between gap-4">
              <dt className="text-ink/60">{l.k}</dt>
              <dd className={`text-right ${l.bad ? "text-void" : ""}`}>{l.v}</dd>
            </div>
          ))}
        </dl>
        {footer && (
          <>
            <div className="receipt-rule my-3" />
            <div className="text-ink/60">{footer}</div>
          </>
        )}
      </div>
      {status !== "none" && (
        <div className={`pointer-events-none absolute bottom-8 right-6 ${status === "proven" ? "text-proof" : "text-void"}`}>
          <span className={`stamp text-2xl ${animate ? "stamp-in" : ""}`}>{status === "proven" ? "PROVEN" : "REVOKED"}</span>
        </div>
      )}
    </div>
  );
}
