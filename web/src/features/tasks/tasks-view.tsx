"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";

type Task = Tables<"task_updates">;
type Emp = Pick<Tables<"employees">, "id" | "emp_code" | "full_name">;

const STATUSES = ["Update Shared", "No Update", "WFH", "Leave", "Sick Leave", "Holiday"];
const FIELDS = ["update_status", "project", "task_assigned", "completed", "not_working", "blocker", "proof_link", "next_task", "remarks"] as const;
type FieldKey = (typeof FIELDS)[number];
const PAGE_SIZE = 10;
const today = () => new Date().toISOString().slice(0, 10);
const tone = (s: string) => (s === "Update Shared" ? "green" : s === "No Update" ? "red" : "gray");

export function TasksView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<{ emp: Emp; row: Task | null } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", date],
    queryFn: async () => {
      const [{ data: employees, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, emp_code, full_name").eq("status", "Active").order("emp_code"),
        supabase.from("task_updates").select("*").eq("upd_date", date),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byEmp: Record<string, Task> = {};
      (rows ?? []).forEach((r) => (byEmp[r.employee_id] = r));
      return { employees: (employees ?? []) as Emp[], byEmp };
    },
  });

  const employees = data?.employees ?? [];
  const stats = useMemo(() => {
    let shared = 0, none = 0;
    for (const e of employees) {
      const s = data?.byEmp[e.id]?.update_status ?? "No Update";
      if (s === "Update Shared") shared++;
      else if (s === "No Update") none++;
    }
    return { shared, none, total: employees.length };
  }, [employees, data]);

  const pages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const rows = useMemo(() => employees.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [employees, page]);

  const kpis = [
    { label: "No Update", value: stats.none },
    { label: "Update Shared", value: stats.shared },
    { label: "Total Employees", value: stats.total },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Daily Task Log</h1>
        <p className="mt-1 text-sm text-muted">Track daily tasks and updates for your team.</p>
      </div>

      <div className="mb-4 rounded-lg border-l-4 border-brand bg-brand-soft px-4 py-2.5 text-sm text-brand-dark">
        Missing update = no work done for the day. Updates are due before 5:30 PM daily.
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-xs font-semibold text-muted">Date</label>
        <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(0); }} className="w-auto" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-sm text-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Blocker</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Loading…</td></tr>
              )}
              {rows.map((e) => {
                const r = data?.byEmp[e.id] ?? null;
                const s = r?.update_status ?? "No Update";
                return (
                  <tr key={e.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                    <td className="px-4 py-3 text-muted">{e.emp_code}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{e.full_name}</td>
                    <td className="px-4 py-3"><Badge tone={tone(s)}>{s}</Badge></td>
                    <td className="px-4 py-3 text-muted">{r?.project ?? "—"}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-muted">{r?.completed ?? "—"}</td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-muted">{r?.blocker ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r?.proof_link ? (
                        <a href={r.proof_link} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">link</a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => setEditing({ emp: e, row: r })}>
                        {r ? "Edit" : "Log"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {employees.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <span className="text-xs font-semibold text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, employees.length)} of {employees.length}
          </span>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
        </div>
      )}

      {editing && (
        <TaskForm
          emp={editing.emp}
          row={editing.row}
          date={date}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["tasks", date] }); }}
        />
      )}
    </div>
  );
}

function TaskForm({ emp, row, date, onClose, onSaved }: { emp: Emp; row: Task | null; date: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState<Record<FieldKey, string>>(() => {
    const init = {} as Record<FieldKey, string>;
    FIELDS.forEach((k) => (init[k] = (row?.[k] as string) ?? ""));
    if (!init.update_status) init.update_status = "Update Shared";
    return init;
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: orgId } = await supabase.rpc("my_org");
      const payload: TablesInsert<"task_updates"> = {
        employee_id: emp.id,
        upd_date: date,
        org_id: orgId,
        update_status: form.update_status || null,
        project: form.project || null,
        task_assigned: form.task_assigned || null,
        completed: form.completed || null,
        not_working: form.not_working || null,
        blocker: form.blocker || null,
        proof_link: form.proof_link || null,
        next_task: form.next_task || null,
        remarks: form.remarks || null,
      };
      const { error } = await supabase.from("task_updates").upsert(payload, { onConflict: "employee_id,upd_date" });
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  const set = (k: FieldKey, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-ink">{row ? "Edit" : "Log"} update — {emp.full_name}</h2>
        <p className="mb-4 text-xs text-muted">{date}</p>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Update Status">
              <Select value={form.update_status} onChange={(e) => set("update_status", e.target.value)}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Client / Project"><Input value={form.project} onChange={(e) => set("project", e.target.value)} /></Field>
          <Field label="Proof link"><Input value={form.proof_link} onChange={(e) => set("proof_link", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Task Assigned"><Input value={form.task_assigned} onChange={(e) => set("task_assigned", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Completed"><Input value={form.completed} onChange={(e) => set("completed", e.target.value)} /></Field></div>
          <Field label="Blocker"><Input value={form.blocker} onChange={(e) => set("blocker", e.target.value)} /></Field>
          <Field label="Next Task"><Input value={form.next_task} onChange={(e) => set("next_task", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Remarks"><Input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field></div>

          {mutation.isError && <p className="col-span-2 text-sm text-brand-dark">{(mutation.error as Error).message}</p>}
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
