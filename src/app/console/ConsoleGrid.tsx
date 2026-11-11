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
  repeated: number;
  likelyFake: boolean;
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
  const [storeF, setStoreF] = useState<"all" | "Quiet Hour" | "MegaBoom">("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/console", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as Data;
    setData(d);
    setPending((p) => {
      if (p && d.orders.find((o) => o.orderId === p)?.status === "refunded") {
        setMsg(`PayPal's verified webhook arrived: order ${p} refunded, its review proof revoked.`);
        return null;
      }
      return p;
    });
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
      setPending(orderId);
      const r = await fetch("/api/orders/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setMsg(j.error ?? "Refund failed");
        setPending(null);
      }
      load();
    },
    [load],
  );

  const reviewCols = useMemo<ColDef<ReviewRow>[]>(
    () => [
      { field: "store", width: 120, filter: true },
      { field: "product", flex: 1, minWidth: 170, filter: true },
      { field: "rating", width: 120, filter: "agNumberColumnFilter", valueFormatter: (p) => "★".repeat(Number(p.value)), cellClass: "text-amber-500" },
      { field: "proof", headerName: "PayPal proof", width: 130, filter: true, cellRenderer: ProofCell },
      { field: "matchedOn", headerName: "Matched on", width: 115 },
      { field: "aiScore", headerName: "AI-written", width: 140, filter: "agNumberColumnFilter", cellRenderer: ScoreCell, sort: "desc" },
      {
        field: "repeated",
        headerName: "Copied text",
        width: 130,
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => (Number(p.value) > 0 ? `in ${p.value} others` : ""),
      },
      {
        field: "injection",
        headerName: "Agent injection",
        width: 140,
        cellDataType: false,
        filter: true,
        cellRenderer: (p: ICellRendererParams<ReviewRow>) => (p.value ? <span className="font-medium text-void">found, removed</span> : null),
      },
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

  const qh = data?.reviews.filter((r) => r.store === "Quiet Hour") ?? [];
  const mb = data?.reviews.filter((r) => r.store === "MegaBoom") ?? [];
  const avg = (xs: ReviewRow[]) => (xs.length ? (xs.reduce((a, r) => a + r.rating, 0) / xs.length).toFixed(2) : "–");
  const tiles = [
    { k: "Proven reviews", v: qh.filter((r) => r.proof === "proven").length, sub: `Quiet Hour · avg ${avg(qh.filter((r) => r.proof === "proven"))}★` },
    { k: "Proofs revoked", v: qh.filter((r) => r.proof === "revoked").length, sub: "refund, reversal or dispute" },
    { k: "Competitor reviews", v: mb.length, sub: `MegaBoom · avg ${avg(mb)}★ · 0 proven` },
    { k: "Likely fake", v: mb.filter((r) => r.likelyFake).length, sub: `AI-written or copied text · ${mb.filter((r) => r.injection).length} aimed at AI agents` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid divide-ink/10 border-y border-ink/10 sm:grid-cols-4 sm:divide-x">
        {tiles.map((t) => (
          <div key={t.k} className="px-4 py-4 first:pl-0">
            <div className="text-sm text-ink/60">{t.k}</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{t.v}</div>
            <div className="text-xs text-ink/50">{t.sub}</div>
          </div>
        ))}
      </div>
      {msg && <p className="rounded-lg bg-zinc-100 p-2 text-sm">{msg}</p>}
      <div className="flex items-center gap-2">
        {(["reviews", "orders", "events"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-ink text-white" : "bg-white ring-1 ring-ink/15"}`}>
            {t === "events" ? "PayPal webhooks" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        {tab === "reviews" && (
          <select value={storeF} onChange={(e) => setStoreF(e.target.value as typeof storeF)} aria-label="Store" className="ml-2 rounded-md border border-ink/20 bg-white px-2 py-1.5 text-sm">
            <option value="all">All stores</option>
            <option>Quiet Hour</option>
            <option>MegaBoom</option>
          </select>
        )}
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Search…" className="ml-auto w-56 rounded-md border border-ink/20 bg-white px-3 py-1.5 text-sm" />
      </div>
      <div style={{ height: 560 }}>
        {tab === "reviews" && (
          <AgGridReact<ReviewRow> theme={theme} rowData={(data?.reviews ?? []).filter((r) => storeF === "all" || r.store === storeF)} columnDefs={reviewCols} quickFilterText={quick} getRowId={(p) => p.data.id} pagination paginationPageSize={50} enableCellTextSelection />
        )}
        {tab === "orders" && <AgGridReact<OrderRow> theme={theme} rowData={data?.orders ?? []} columnDefs={orderCols} quickFilterText={quick} getRowId={(p) => p.data.orderId} />}
        {tab === "events" && <AgGridReact<EventRow> theme={theme} rowData={data?.events ?? []} columnDefs={eventCols} quickFilterText={quick} getRowId={(p) => p.data.id} />}
      </div>
    </div>
  );
}
