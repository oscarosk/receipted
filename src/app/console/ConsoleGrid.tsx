"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type ValueFormatterParams,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type ReviewRow = {
  id: string;
  store: string;
  product: string;
  rating: number;
  title: string;
  author: string;
  createdAt: string;
  proof: "proven" | "revoked" | "none";
  matchedOn: string;
  aiScore: number;
  injection: boolean;
  flags: string;
  orderId: string;
  orderStatus: string;
  amount: number | null;
  seeded: boolean;
};
type OrderRow = { orderId: string; store: string; product: string; amount: number; status: string; payer: string; captureId: string; paidAt: string; reviewed: boolean };
type EventRow = { id: string; type: string; verified: boolean; at: string; effect?: string };
type Data = { reviews: ReviewRow[]; orders: OrderRow[]; events: EventRow[] };

const theme = themeQuartz.withParams({ fontFamily: "inherit", headerFontWeight: 600, accentColor: "#047857", fontSize: 13 });

const date = (p: ValueFormatterParams) => (p.value ? new Date(p.value as string).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "");

function ProofCell(p: ICellRendererParams<ReviewRow>) {
  const v = p.value as ReviewRow["proof"];
  const cls = v === "proven" ? "bg-emerald-50 text-emerald-800" : v === "revoked" ? "bg-rose-50 text-rose-800" : "bg-zinc-100 text-zinc-500";
  const label = v === "proven" ? "✓ proven" : v === "revoked" ? "revoked" : "unproven";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function ScoreCell(p: ICellRendererParams<ReviewRow>) {
  const v = Number(p.value ?? 0);
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-16 rounded bg-zinc-200">
        <div className={`h-1.5 rounded ${v >= 0.6 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.round(v * 100)}%` }} />
      </div>
      <span className="tabular-nums">{v.toFixed(2)}</span>
    </div>
  );
}

export default function ConsoleGrid() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"reviews" | "orders" | "events">("reviews");
  const [quick, setQuick] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/console", { cache: "no-store" });
    if (r.ok) setData((await r.json()) as Data);
  }, []);

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 4000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [load]);

  const refund = useCallback(
    async (orderId: string) => {
      setMsg("Refund sent to PayPal. Waiting for the verified webhook to revoke the proof…");
      const r = await fetch("/api/orders/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMsg(j.error ?? "Refund failed");
      load();
    },
    [load],
  );

  const reviewCols = useMemo<ColDef<ReviewRow>[]>(
    () => [
      { field: "store", width: 120, filter: true, rowGroup: false },
      { field: "product", flex: 1, minWidth: 180, filter: true },
      { field: "rating", width: 95, filter: "agNumberColumnFilter", valueFormatter: (p) => "★".repeat(Number(p.value)) },
      { field: "proof", headerName: "PayPal proof", width: 130, filter: true, cellRenderer: ProofCell },
      { field: "matchedOn", headerName: "Matched on", width: 115 },
      { field: "aiScore", headerName: "AI-written", width: 140, filter: "agNumberColumnFilter", cellRenderer: ScoreCell, sort: "desc" },
      { field: "injection", headerName: "Injection", width: 105, filter: true, valueFormatter: (p) => (p.value ? "removed" : "") },
      { field: "title", flex: 1, minWidth: 160 },
      { field: "flags", headerName: "Screener notes", flex: 1, minWidth: 200, tooltipField: "flags" },
      { field: "author", width: 120 },
      { field: "createdAt", headerName: "Posted", width: 170, valueFormatter: date, filter: "agDateColumnFilter" },
      { field: "orderStatus", headerName: "Order", width: 100 },
    ],
    [],
  );

  const orderCols = useMemo<ColDef<OrderRow>[]>(
    () => [
      { field: "orderId", headerName: "PayPal order", width: 190 },
      { field: "product", flex: 1, minWidth: 180 },
      { field: "amount", width: 100, valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      { field: "status", width: 110, filter: true },
      { field: "payer", width: 130 },
      { field: "reviewed", width: 100, valueFormatter: (p) => (p.value ? "yes" : "") },
      { field: "paidAt", headerName: "Paid", width: 170, valueFormatter: date },
      {
        headerName: "Action",
        width: 130,
        cellRenderer: (p: ICellRendererParams<OrderRow>) =>
          p.data?.status === "paid" ? (
            <button className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white" onClick={() => refund(p.data!.orderId)}>
              Refund
            </button>
          ) : null,
      },
    ],
    [refund],
  );

  const eventCols = useMemo<ColDef<EventRow>[]>(
    () => [
      { field: "at", headerName: "Received", width: 180, valueFormatter: date, sort: "desc" },
      { field: "type", flex: 1 },
      { field: "verified", width: 110, valueFormatter: (p) => (p.value ? "✓ verified" : "✗ rejected") },
      { field: "effect", flex: 1 },
    ],
    [],
  );

  const qh = data?.reviews.filter((r) => r.store === "quiet-hour") ?? [];
  const mb = data?.reviews.filter((r) => r.store === "megaboom") ?? [];
  const avg = (xs: ReviewRow[]) => (xs.length ? (xs.reduce((a, r) => a + r.rating, 0) / xs.length).toFixed(2) : "–");
  const tiles = [
    { k: "Proven reviews", v: qh.filter((r) => r.proof === "proven").length, sub: `Quiet Hour · avg ${avg(qh.filter((r) => r.proof === "proven"))}★` },
    { k: "Proofs revoked", v: qh.filter((r) => r.proof === "revoked").length, sub: "refund, reversal or dispute" },
    { k: "Competitor reviews", v: mb.length, sub: `MegaBoom · avg ${avg(mb)}★ · 0 proven` },
    { k: "Likely AI-written", v: mb.filter((r) => r.aiScore >= 0.6).length, sub: `${mb.filter((r) => r.injection).length} with agent-targeted injection` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-xs text-zinc-500">{t.k}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{t.v}</div>
            <div className="text-xs text-zinc-500">{t.sub}</div>
          </div>
        ))}
      </div>
      {msg && <p className="rounded-lg bg-zinc-100 p-2 text-sm">{msg}</p>}
      <div className="flex items-center gap-2">
        {(["reviews", "orders", "events"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-zinc-900 text-white" : "bg-white ring-1 ring-zinc-200"}`}>
            {t === "events" ? "PayPal webhooks" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Search…" className="ml-auto w-56 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" />
      </div>
      <div style={{ height: 560 }}>
        {tab === "reviews" && (
          <AgGridReact<ReviewRow> theme={theme} rowData={data?.reviews ?? []} columnDefs={reviewCols} quickFilterText={quick} getRowId={(p) => p.data.id} pagination paginationPageSize={50} enableCellTextSelection />
        )}
        {tab === "orders" && <AgGridReact<OrderRow> theme={theme} rowData={data?.orders ?? []} columnDefs={orderCols} quickFilterText={quick} getRowId={(p) => p.data.orderId} />}
        {tab === "events" && <AgGridReact<EventRow> theme={theme} rowData={data?.events ?? []} columnDefs={eventCols} quickFilterText={quick} getRowId={(p) => p.data.id} />}
      </div>
    </div>
  );
}
