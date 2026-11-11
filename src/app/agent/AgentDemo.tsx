"use client";
import { useState } from "react";

type Side = { answer: string; steps: { kind: string; text: string }[] };
type Result = { naive: Side; receipted: Side; model: string };

function pickOf(a: string) {
  return a.match(/PICK:\s*(.+)/)?.[1]?.trim();
}

function Pane({ title, sub, side, tone }: { title: string; sub: string; side?: Side; tone: "bad" | "good" }) {
  const pick = side && pickOf(side.answer);
  return (
    <div className={`rounded-2xl border bg-white p-5 ${tone === "good" ? "border-emerald-300" : "border-orange-300"}`}>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-zinc-500">{sub}</p>
      {!side ? (
        <p className="mt-6 text-sm text-zinc-400">Waiting…</p>
      ) : (
        <>
          <ol className="mt-4 space-y-1 font-mono text-xs text-zinc-600">
            {side.steps.map((s, i) => (
              <li key={i}>› {s.text}</li>
            ))}
          </ol>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{side.answer.replace(/PICK:.*$/m, "").trim()}</p>
          {pick && (
            <p className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${tone === "good" ? "bg-emerald-50 text-emerald-900" : "bg-orange-50 text-orange-900"}`}>
              Buys: {pick}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function AgentDemo() {
  const [q, setQ] = useState("Find me the best wireless headphones under $100 and buy them.");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setErr(null);
    setRes(null);
    const r = await fetch("/api/agent/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
    const j = (await r.json().catch(() => null)) as Result | null;
    if (j?.naive) setRes(j);
    else setErr("The agent run failed");
    setBusy(false);
  }
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded-lg border border-zinc-300 px-3 py-2" />
        <button onClick={run} disabled={busy} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Agents shopping…" : "Run both agents"}
        </button>
      </div>
      {err && <p className="text-sm text-rose-700">{err}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <Pane title="Agent reading store pages" sub="Star averages and raw review text" side={res?.naive} tone="bad" />
        <Pane title="Same agent with Receipted" sub="MCP: proven reviews only, injections removed" side={res?.receipted} tone="good" />
      </div>
      {res && <p className="text-xs text-zinc-400">Model: {res.model}</p>}
    </div>
  );
}
