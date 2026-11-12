import Link from "next/link";
import { Shell } from "@/components/ui";

export const metadata = { title: "Receipted · try it in 3 minutes" };

const buyer = {
  email: process.env.JUDGE_BUYER_EMAIL || "Ask in the Devpost comments for a sandbox buyer login",
  password: process.env.JUDGE_BUYER_PASSWORD || "",
};

const steps = [
  {
    t: "Watch two agents shop",
    d: "Open the agent demo and press Run both agents. The one reading store pages picks MegaBoom; the one using Receipted checks PayPal-proven reviews first.",
    href: "/agent",
    cta: "Open the agent demo",
  },
  {
    t: "Buy something with the sandbox buyer",
    d: "On QH Buds or the walnut stand, press Pay with PayPal and log in with the sandbox buyer below. No real money moves.",
    href: "/store/quiet-hour",
    cta: "Open Quiet Hour",
  },
  {
    t: "Write a proven review",
    d: "On the thank-you page, choose Write a proven review and sign in with the same sandbox buyer. You get a signed proof page.",
  },
  {
    t: "Refund it and watch the proof come off",
    d: "In the console, open Orders and press Refund on your order. PayPal's verified webhook revokes the proof within seconds.",
    href: "/console",
    cta: "Open the console",
  },
];

export default function Judge() {
  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tight">Try Receipted in about three minutes</h1>
      <p className="mt-2 max-w-2xl text-ink/65">Everything runs on the PayPal sandbox, live. The stores are fictional.</p>
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px]">
        <ol className="space-y-6">
          {steps.map((s, i) => (
            <li key={s.t} className="grid grid-cols-[2rem_1fr]">
              <span className="font-mono text-ink/40">{i + 1}</span>
              <div>
                <h2 className="font-medium">{s.t}</h2>
                <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink/70">{s.d}</p>
                {s.href && (
                  <Link href={s.href} className="mt-2 inline-block text-sm font-semibold text-proof underline underline-offset-4">
                    {s.cta}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
        <aside className="h-fit rounded-sm border-t-4 border-[#0070e0] bg-white p-5 text-sm">
          <h2 className="font-semibold">Sandbox buyer</h2>
          <p className="mt-1 text-ink/60">A PayPal sandbox test account. It only works on sandbox.paypal.com.</p>
          <dl className="mt-3 space-y-2 font-mono text-[13px]">
            <div>
              <dt className="text-ink/50">Email</dt>
              <dd className="break-all">{buyer.email}</dd>
            </div>
            {buyer.password && (
              <div>
                <dt className="text-ink/50">Password</dt>
                <dd>{buyer.password}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-ink/60">
            For agents: MCP at <code className="font-mono">/api/mcp</code>, proofs at <code className="font-mono">/api/proof/&#123;id&#125;</code>.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
