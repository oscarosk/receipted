import Link from "next/link";
import { Shell } from "@/components/ui";

const links = [
  { href: "/store/quiet-hour/qh-1", t: "Shop Quiet Hour Audio", d: "Buy with PayPal sandbox, then leave a review only you can prove." },
  { href: "/store/megaboom/mb-x1", t: "See MegaBoom Sound", d: "400 five-star reviews. None tied to a payment." },
  { href: "/agent", t: "Agent demo", d: "Same AI agent, same question: scraped pages vs Receipted." },
  { href: "/console", t: "Merchant console", d: "Every review, its proof and the AI screener's notes, in AG Grid." },
];

export default function Home() {
  return (
    <Shell>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Reviews proven by PayPal.</h1>
        <p className="mt-4 text-lg text-zinc-700">
          A review counts only if the same PayPal account paid for the order, the payment was captured, and nothing was refunded or
          disputed. People see a proof badge. AI shopping agents get signed proofs over MCP, and never see text planted to steer them.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-400">
            <h2 className="font-medium">{l.t} →</h2>
            <p className="mt-1 text-sm text-zinc-600">{l.d}</p>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-xs text-zinc-400">
        For agents: MCP at <code>/api/mcp</code> · JSON feed at <code>/api/agent/feed</code> · proof key at <code>/.well-known/receipted-key.json</code> ·{" "}
        <Link href="/gate" className="underline">day-1 gate</Link>
      </p>
    </Shell>
  );
}
