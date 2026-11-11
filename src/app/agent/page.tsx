import { Shell } from "@/components/ui";
import AgentDemo from "./AgentDemo";

export const metadata = { title: "Receipted · agent demo" };

export default function Page() {
  return (
    <Shell>
      <h1 className="text-3xl font-semibold tracking-tight">Two shopping agents, one question</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">
        MegaBoom shows 400 glowing reviews, none tied to a payment, and some contain hidden instructions for AI agents. Quiet Hour&apos;s reviews
        are proven by PayPal. Watch what each agent buys.
      </p>
      <AgentDemo />
    </Shell>
  );
}
