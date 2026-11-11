import { Shell } from "@/components/ui";
import ConsoleGrid from "./ConsoleGrid";

export const metadata = { title: "Receipted · merchant console" };

export default function Page() {
  return (
    <Shell wide>
      <h1 className="text-3xl font-semibold tracking-tight">Merchant console</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">Every review, its PayPal proof, and what the AI screener found. Refunds here flip proofs live via PayPal webhooks.</p>
      <ConsoleGrid />
    </Shell>
  );
}
