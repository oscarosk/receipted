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
    <div className={`rounded-sm border-t-4 bg-white p-6 ${tone === "good" ? "border-proof" : "border-boom"}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-ink/55">{sub}</p>
      {!side ? (
        <p className="mt-6 text-sm text-zinc-400">Waiting…</p>
      ) : (
        <>
          <ol className="mt-4 space-y-1 rounded-sm bg-page p-3 font-mono text-xs leading-5 text-ink/70">
            {side.steps.map((s, i) => (
              <li key={i}>› {s.text}</li>
            ))}
          </ol>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{side.answer.replace(/PICK:.*$/m, "").trim()}</p>
          {pick && (
            <p className={`mt-5 rounded-sm px-3 py-2.5 font-semibold ${tone === "good" ? "bg-proof-soft text-proof" : "bg-[#ffe9df] text-[#a3300a]"}`}>
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
        <input value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 rounded-md border border-ink/20 bg-white px-3 py-2" />
        <button onClick={run} disabled={busy} className="rounded-md bg-ink px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
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
