import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-10">
      <h1 className="text-3xl font-semibold">Receipted</h1>
      <p className="text-zinc-700">
        Reviews proven by PayPal. A review counts only if the same PayPal account paid for the order, the payment was captured, and
        nothing was refunded, so shoppers and AI shopping agents can tell real reviews from fakes.
      </p>
      <p className="text-sm text-zinc-500">Built for the PayPal AI Hackathon 2026. PayPal sandbox only; no real money moves.</p>
      <Link href="/gate" className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
        Open the day-1 gate
      </Link>
    </main>
  );
}
