import { Suspense } from "react";
import GateClient from "./GateClient";

export const metadata = { title: "Receipted · day-1 gate" };

async function Gate({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return <GateClient initialOrderId={one(sp.order)} initialError={one(sp.error)} />;
}

export default function GatePage(props: PageProps<"/gate">) {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-zinc-500">Loading…</main>}>
      <Gate searchParams={props.searchParams} />
    </Suspense>
  );
}
