"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/lib/database.types";
import { Avatar, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { initials, inr } from "@/lib/utils";

export type Kind = "quotes" | "invoices";
type LineItem = { desc: string; qty: number; rate: number };
type Doc = {
  id: string;
  client_id: string | null;
  items: Json;
  subtotal: number | null;
  tax_pct: number | null;
  tax_amount: number | null;
  total: number | null;
  status: string | null;
  notes: string | null;
  quote_no?: string;
  invoice_no?: string;
  quote_date?: string;
  invoice_date?: string;
  valid_until?: string | null;
  due_date?: string | null;
};
type Client = Pick<Tables<"clients">, "id" | "name">;

const CFG = {
  quotes: { title: "Quotes", sub: "Create, manage and track all your quotes.", noun: "Quote", prefix: "Q", noField: "quote_no", dateField: "quote_date", dueField: "valid_until", dueLabel: "Valid Until", statuses: ["Draft", "Sent", "Accepted", "Rejected", "Expired"] },
  invoices: { title: "Invoices", sub: "Create, manage and track all your invoices.", noun: "Invoice", prefix: "INV", noField: "invoice_no", dateField: "invoice_date", dueField: "due_date", dueLabel: "Due Date", statuses: ["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"] },
} as const;

const today = () => new Date().toISOString().slice(0, 10);
const asItems = (j: Json): LineItem[] => (Array.isArray(j) ? (j as unknown as LineItem[]) : []);
const tone = (s: string | null) =>
  s === "Paid" || s === "Accepted" ? "green" : s === "Unpaid" || s === "Rejected" || s === "Overdue" ? "red" : "gray";

export function DocsView({ kind }: { kind: Kind }) {
  const cfg = CFG[kind];
  const supabase = createClient();
  // dynamic table name — cast at this boundary keeps the rest type-safe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => supabase.from(kind) as any;
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Doc | null>(null);
  const [open, setOpen] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["docs", kind] });

  const { data, isLoading } = useQuery({
    queryKey: ["docs", kind],
    queryFn: async () => {
      const [{ data: docs, error: e1 }, { data: clients, error: e2 }] = await Promise.all([
        table().select("*").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").order("name"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byId: Record<string, string> = {};
      (clients ?? []).forEach((c) => (byId[c.id] = c.name));
      return { docs: (docs ?? []) as Doc[], clients: (clients ?? []) as Client[], clientName: byId };
    },
  });

  const docs = data?.docs ?? [];
  const summary = useMemo(() => {
    const s = { total: docs.length, paid: 0, paidV: 0, part: 0, partV: 0, unp: 0, unpV: 0 };
    for (const d of docs) {
      const v = Number(d.total ?? 0);
      if (d.status === "Paid" || d.status === "Accepted") { s.paid++; s.paidV += v; }
      else if (d.status === "Partially Paid") { s.part++; s.partV += v; }
      else { s.unp++; s.unpV += v; }
    }
    return s;
  }, [docs]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toInvoice = useMutation({
    mutationFn: async (q: Doc) => {
      const { data: orgId } = await supabase.rpc("my_org");
      const no = "INV-" + Date.now().toString().slice(-6);
      const { error } = await supabase.from("invoices").insert({
        invoice_no: no, client_id: q.client_id, quote_id: q.id, items: q.items,
        subtotal: q.subtotal, tax_pct: q.tax_pct, tax_amount: q.tax_amount, total: q.total,
        status: "Unpaid", notes: q.notes, org_id: orgId,
      });
      if (error) throw error;
      return no;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["docs", "invoices"] }),
  });

  const kpis = kind === "quotes"
    ? [["Total Quotes", summary.total], ["Accepted", summary.paid], ["Other", summary.part + summary.unp]]
    : [["Total Invoices", summary.total], ["Paid", summary.paid], ["Partially Paid", summary.part], ["Unpaid", summary.unp]];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{cfg.title}</h1>
          <p className="mt-1 text-sm text-muted">{cfg.sub}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ New {cfg.noun}</Button>
      </div>

      <div className={"mb-5 grid grid-cols-1 gap-4 " + (kpis.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
        {kpis.map(([l, v]) => (
          <Card key={l as string}>
            <div className="text-sm text-muted">{l}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{v}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading…</td></tr>}
              {!isLoading && docs.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No {cfg.title.toLowerCase()} yet.</td></tr>}
              {docs.map((d) => {
                const no = (d[cfg.noField as keyof Doc] as string) ?? "—";
                const date = (d[cfg.dateField as keyof Doc] as string) ?? "—";
                const cname = d.client_id ? data?.clientName[d.client_id] ?? "—" : "—";
                return (
                  <tr key={d.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                    <td className="px-4 py-3 font-bold text-ink">{no}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5"><Avatar name={initials(cname)} /><span>{cname}</span></div>
                    </td>
                    <td className="px-4 py-3 text-muted">{date}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{inr(d.total)}</td>
                    <td className="px-4 py-3"><Badge tone={tone(d.status)}>{d.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => { setEditing(d); setOpen(true); }}>Edit</Button>
                        <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => printDoc(kind, d, cname)}>View/Print</Button>
                        {kind === "quotes" && (
                          <Button variant="outline" className="px-3 py-1 text-xs" disabled={toInvoice.isPending}
                            onClick={() => toInvoice.mutate(d)}>→ Invoice</Button>
                        )}
                        <Button variant="danger" className="px-3 py-1 text-xs" disabled={del.isPending}
                          onClick={() => { if (confirm("Delete this document?")) del.mutate(d.id); }}>Del</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {toInvoice.isSuccess && <p className="mt-3 text-sm font-medium text-emerald-700">Invoice {toInvoice.data} created from quote.</p>}

      {open && (
        <DocForm
          kind={kind}
          doc={editing}
          clients={data?.clients ?? []}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); invalidate(); }}
        />
      )}
    </div>
  );
}

function DocForm({ kind, doc, clients, onClose, onSaved }: { kind: Kind; doc: Doc | null; clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const cfg = CFG[kind];
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => supabase.from(kind) as any;
  const [no, setNo] = useState((doc?.[cfg.noField as keyof Doc] as string) ?? "");
  const [clientId, setClientId] = useState(doc?.client_id ?? clients[0]?.id ?? "");
  const [date, setDate] = useState((doc?.[cfg.dateField as keyof Doc] as string) ?? today());
  const [due, setDue] = useState((doc?.[cfg.dueField as keyof Doc] as string) ?? "");
  const [status, setStatus] = useState(doc?.status ?? cfg.statuses[0]);
  const [taxPct, setTaxPct] = useState(doc?.tax_pct ?? 18);
  const [notes, setNotes] = useState(doc?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(doc ? asItems(doc.items) : [{ desc: "", qty: 1, rate: 0 }]);

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const tax = (subtotal * (Number(taxPct) || 0)) / 100;
  const total = subtotal + tax;

  const setItem = (i: number, k: keyof LineItem, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: k === "desc" ? v : Number(v) || 0 } : it)));

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = items.filter((it) => it.desc.trim());
      const common = {
        client_id: clientId || null,
        items: cleaned as unknown as Json,
        subtotal, tax_pct: Number(taxPct) || 0, tax_amount: tax, total,
        status, notes: notes || null, custom_html: null,
      };
      const typed = kind === "quotes"
        ? { ...common, quote_no: no, quote_date: date, valid_until: due || null }
        : { ...common, invoice_no: no, invoice_date: date, due_date: due || null };
      if (doc) {
        const { error } = await table().update(typed).eq("id", doc.id);
        if (error) throw error;
      } else {
        const { data: orgId } = await supabase.rpc("my_org");
        const { error } = await table().insert({ ...typed, org_id: orgId });
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{doc ? "Edit" : "New"} {cfg.noun}</h2>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${cfg.noun} No.`}><Input value={no} onChange={(e) => setNo(e.target.value)} placeholder={`${cfg.prefix}-${new Date().getFullYear()}-001`} /></Field>
            <Field label="Client">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label={cfg.dueLabel}><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</Select>
            </Field>
            <Field label="Tax %"><Input type="number" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value) || 0)} /></Field>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-semibold text-muted">Line Items</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_68px_100px_96px_auto] items-center gap-2">
                  <Input placeholder="Description" value={it.desc} onChange={(e) => setItem(i, "desc", e.target.value)} />
                  <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
                  <Input type="number" placeholder="Rate" value={it.rate} onChange={(e) => setItem(i, "rate", e.target.value)} />
                  <div className="text-right text-sm tabular-nums text-muted">{inr(it.qty * it.rate)}</div>
                  <Button type="button" variant="danger" className="px-2 py-1 text-xs" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))}>×</Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="mt-2 px-3 py-1 text-xs" onClick={() => setItems((a) => [...a, { desc: "", qty: 1, rate: 0 }])}>+ Row</Button>
          </div>

          <div className="mt-3 text-right text-sm font-semibold text-ink">
            Subtotal {inr(subtotal)} + Tax {inr(tax)} = <span className="text-brand">Total {inr(total)}</span>
          </div>

          <div className="mt-3"><Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>

          {save.isError && <p className="mt-2 text-sm text-brand-dark">{(save.error as Error).message}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Open a clean, self-contained printable document in a new window.
function printDoc(kind: Kind, d: Doc, clientName: string) {
  const cfg = CFG[kind];
  const items = asItems(d.items);
  const no = (d[cfg.noField as keyof Doc] as string) ?? "";
  const date = (d[cfg.dateField as keyof Doc] as string) ?? "";
  const money = (v: number) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const rows = items
    .map((it, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(it.desc)}</td><td class="r">${it.qty}</td><td class="r">${money(it.rate)}</td><td class="r">${money(it.qty * it.rate)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${cfg.noun} ${no}</title>
  <style>
    *{font-family:Inter,Arial,sans-serif;box-sizing:border-box}
    body{margin:0;padding:40px;color:#15161a}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #D93A31;padding-bottom:16px}
    .brand{font-size:26px;font-weight:800;color:#D93A31}
    h1{font-size:20px;margin:0;text-transform:uppercase;color:#15161a}
    .muted{color:#767b85;font-size:13px}
    .meta{margin:22px 0;display:flex;justify-content:space-between;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px}
    th,td{border:1px solid #e4e4e4;padding:9px 11px;text-align:left}
    th{background:#f7f6f3;text-transform:uppercase;font-size:11px;letter-spacing:.4px}
    td.r,th.r{text-align:right}
    .tot{margin-top:14px;margin-left:auto;width:280px;font-size:14px}
    .tot div{display:flex;justify-content:space-between;padding:5px 0}
    .tot .g{font-weight:800;font-size:16px;border-top:2px solid #15161a;padding-top:8px}
    .notes{margin-top:24px;font-size:13px;color:#41454e}
    @media print{body{padding:20px}}
  </style></head><body>
    <div class="head">
      <div><div class="brand">Merik</div><div class="muted">Workforce Suite</div></div>
      <div style="text-align:right"><h1>${cfg.noun}</h1><div class="muted">${escapeHtml(no)}</div></div>
    </div>
    <div class="meta">
      <div><div class="muted">Billed To</div><b>${escapeHtml(clientName)}</b></div>
      <div style="text-align:right"><div class="muted">Date</div><b>${escapeHtml(date)}</b></div>
    </div>
    <table><thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">
      <div><span>Subtotal</span><span>${money(Number(d.subtotal))}</span></div>
      <div><span>Tax (${d.tax_pct ?? 0}%)</span><span>${money(Number(d.tax_amount))}</span></div>
      <div class="g"><span>Total</span><span>${money(Number(d.total))}</span></div>
    </div>
    ${d.notes ? `<div class="notes"><b>Notes:</b> ${escapeHtml(d.notes)}</div>` : ""}
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`;
  const w = window.open("", "_blank", "width=800,height=900");
  if (w) { w.document.write(html); w.document.close(); }
}

function escapeHtml(s: string | null | undefined) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
