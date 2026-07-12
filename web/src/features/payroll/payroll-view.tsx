"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Select } from "@/components/ui";
import { inr } from "@/lib/utils";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Row = {
  employee_id: string;
  emp_code: string;
  full_name: string;
  email: string | null;
  ctc: number | null;
  auto: boolean;
  pay_status: string;
  sent: boolean;
  total_days: number;
  paid_days: number;
  basic: number;
  hra: number;
  other_allowance: number;
  incentives: number;
  arrears: number;
  pt: number;
  lop: number;
};
type Draft = Pick<
  Row,
  "total_days" | "paid_days" | "basic" | "hra" | "other_allowance" | "incentives" | "arrears" | "pt" | "lop" | "pay_status"
>;

const EDIT: Array<[keyof Draft, string]> = [
  ["total_days", "Days"],
  ["paid_days", "Paid"],
  ["basic", "Basic"],
  ["hra", "HRA"],
  ["other_allowance", "Other"],
  ["incentives", "Incent."],
  ["arrears", "Arrears"],
  ["pt", "PT"],
  ["lop", "LOP"],
];
const PAGE_SIZE = 10;
const nowYm = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const derive = (d: Draft) => {
  const gross = d.basic + d.hra + d.other_allowance;
  const additions = gross + d.incentives + d.arrears;
  const deductions = d.pt + d.lop;
  return { gross, deductions, net: additions - deductions };
};

export function PayrollView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [ym, setYm] = useState(nowYm());
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [year, month] = ym.split("-").map(Number);

  const { data, isLoading, error } = useQuery({
    queryKey: ["payroll", ym],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("payroll", { body: { action: "compute", year, month } });
      if (error) throw error;
      return data as { rows: Row[] };
    },
  });

  useEffect(() => {
    if (!data) return;
    const seed: Record<string, Draft> = {};
    for (const r of data.rows) {
      seed[r.employee_id] = {
        total_days: r.total_days,
        paid_days: r.paid_days,
        basic: r.basic,
        hra: r.hra,
        other_allowance: r.other_allowance,
        incentives: r.incentives,
        arrears: r.arrears,
        pt: r.pt,
        lop: r.lop,
        pay_status: r.pay_status,
      };
    }
    setDraft(seed);
  }, [data]);

  const rows = data?.rows ?? [];
  const ctcById = useMemo(() => Object.fromEntries(rows.map((r) => [r.employee_id, r.ctc])), [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [rows, page]);

  const totals = useMemo(() => {
    let gross = 0, deductions = 0, net = 0;
    for (const r of rows) {
      const d = draft[r.employee_id];
      if (!d) continue;
      const t = derive(d);
      gross += t.gross;
      deductions += t.deductions;
      net += t.net;
    }
    return { gross, deductions, net };
  }, [rows, draft]);

  function edit(id: string, key: keyof Draft, value: string) {
    setDraft((prev) => {
      const cur = { ...(prev[id] as Draft) };
      (cur[key] as unknown) = key === "pay_status" ? value : Number(value) || 0;
      // recompute LOP when days change (mirrors legacy behaviour)
      if (key === "total_days" || key === "paid_days") {
        const ctc = Number(ctcById[id] ?? 0);
        if (ctc && cur.total_days) {
          cur.lop = Math.max(0, Math.round((ctc * (cur.total_days - cur.paid_days)) / cur.total_days));
        }
      }
      return { ...prev, [id]: cur };
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const rowsPayload = rows.map((r) => ({ employee_id: r.employee_id, ...draft[r.employee_id] }));
      const { data, error } = await supabase.functions.invoke("payroll", {
        body: { action: "save", year, month, rows: rowsPayload },
      });
      if (error) throw error;
      return data as { saved: number };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", ym] }),
  });

  const sendPayslip = useMutation({
    mutationFn: async (row: Row) => {
      const d = draft[row.employee_id];
      if (!row.email) throw new Error(`${row.full_name} has no email on file`);
      const t = derive(d);
      // Save this row's current numbers first, so what the employee sees matches what's emailed.
      const { error: saveErr } = await supabase.functions.invoke("payroll", {
        body: { action: "save", year, month, rows: [{ employee_id: row.employee_id, ...d }] },
      });
      if (saveErr) throw saveErr;
      const { error: sentErr } = await supabase
        .from("payroll")
        .update({ sent: true, sent_at: new Date().toISOString() })
        .match({ employee_id: row.employee_id, pay_year: year, pay_month: month });
      if (sentErr) throw sentErr;
      const { error: mailErr } = await supabase.functions.invoke("send-email", {
        body: {
          to: row.email,
          subject: `Your payslip for ${MONTHS[month]} ${year} is ready`,
          html: `<p>Hi ${row.full_name},</p><p>Your payslip for ${MONTHS[month]} ${year} is ready.</p><table cellpadding="6"><tr><td>Gross pay</td><td><b>${inr(t.gross)}</b></td></tr><tr><td>Deductions</td><td><b>${inr(t.deductions)}</b></td></tr><tr><td>Net pay</td><td><b>${inr(t.net)}</b></td></tr></table><p>Sign in to Merik to view the full breakdown.</p>`,
        },
      });
      if (mailErr) throw mailErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll", ym] }),
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Payroll</h1>
          <p className="mt-1 text-sm text-muted">
            Salary is computed server-side (Edge Function) from CTC and attendance.
          </p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
          {save.isPending ? "Saving…" : "Save All"}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-muted">Month</label>
        <Input
          type="month"
          value={ym}
          onChange={(e) => {
            setYm(e.target.value);
            setPage(0);
          }}
          className="w-auto"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-muted">Total Gross Pay</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">{inr(totals.gross)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted">Total Deductions</div>
          <div className="mt-1 text-2xl font-extrabold text-ink">{inr(totals.deductions)}</div>
        </Card>
        <Card>
          <div className="text-sm text-muted">Net Pay (Take Home)</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{inr(totals.net)}</div>
        </Card>
      </div>

      {(error || save.isError || sendPayslip.isError) && (
        <p className="mb-3 text-sm font-medium text-brand-dark">
          {((error || save.error || sendPayslip.error) as Error).message}
        </p>
      )}
      {save.isSuccess && <p className="mb-3 text-sm font-medium text-emerald-700">Saved {save.data.saved} payslip(s).</p>}
      {sendPayslip.isSuccess && <p className="mb-3 text-sm font-medium text-emerald-700">Payslip emailed.</p>}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-3 py-3">Code</th>
                <th className="px-3 py-3">Name</th>
                {EDIT.map(([k, label]) => (
                  <th key={k} className="px-2 py-3">{label}</th>
                ))}
                <th className="px-2 py-3">Gross</th>
                <th className="px-2 py-3">Deduct</th>
                <th className="px-2 py-3">Net</th>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={17} className="px-4 py-10 text-center text-muted">Computing payroll…</td>
                </tr>
              )}
              {pageRows.map((r) => {
                const d = draft[r.employee_id];
                if (!d) return null;
                const t = derive(d);
                return (
                  <tr key={r.employee_id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2 text-muted">{r.emp_code}</td>
                    <td className="px-3 py-2 font-semibold text-ink">
                      {r.full_name}
                      {r.auto && <span title="auto-filled from CTC + attendance" className="ml-1 text-brand">•</span>}
                    </td>
                    {EDIT.map(([k]) => (
                      <td key={k} className="px-1 py-2">
                        <Input
                          type="number"
                          value={d[k] as number}
                          onChange={(e) => edit(r.employee_id, k, e.target.value)}
                          className="w-24 px-2 py-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 tabular-nums">{inr(t.gross)}</td>
                    <td className="px-2 py-2 tabular-nums">{inr(t.deductions)}</td>
                    <td className="px-2 py-2 font-bold tabular-nums text-ink">{inr(t.net)}</td>
                    <td className="px-2 py-2">
                      <Select
                        value={d.pay_status}
                        onChange={(e) => edit(r.employee_id, "pay_status", e.target.value)}
                        className="w-24 px-2 py-1"
                      >
                        <option>Unpaid</option>
                        <option>Paid</option>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      {d.pay_status === "Paid" && !r.auto && (
                        <Button
                          variant={r.sent ? "outline" : "primary"}
                          className="px-2 py-1 text-xs whitespace-nowrap"
                          disabled={sendPayslip.isPending || !r.email}
                          title={r.email ? undefined : "No email on file"}
                          onClick={() => sendPayslip.mutate(r)}
                        >
                          {r.sent ? "Resend" : "Send Payslip"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {rows.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <span className="text-xs font-semibold text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </Button>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
            Next ›
          </Button>
        </div>
      )}
    </div>
  );
}
