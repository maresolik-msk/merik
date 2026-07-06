"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { Avatar, Button, Card, Input, Select } from "@/components/ui";
import { initials } from "@/lib/utils";

type Employee = Pick<Tables<"employees">, "id" | "emp_code" | "full_name" | "department">;
type Draft = { entry_time: string; exit_time: string; status: string; remarks: string };

const STATUS: Array<[string, string]> = [
  ["", "—"],
  ["P", "P — Present"],
  ["A", "A — Absent"],
  ["L", "L — Late"],
  ["H", "H — Half Day"],
  ["W", "W — WFH"],
  ["OL", "OL — Paid Leave"],
  ["UL", "UL — Unpaid Leave"],
];
const PAGE_SIZE = 10;
const empty = (): Draft => ({ entry_time: "", exit_time: "", status: "", remarks: "" });
const today = () => new Date().toISOString().slice(0, 10);

export function AttendanceView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Record<string, Draft>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", date],
    queryFn: async () => {
      const [{ data: employees, error: e1 }, { data: att, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, emp_code, full_name, department").eq("status", "Active").order("emp_code"),
        supabase.from("attendance").select("*").eq("att_date", date),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byEmp: Record<string, Tables<"attendance">> = {};
      (att ?? []).forEach((a) => (byEmp[a.employee_id] = a));
      return { employees: (employees ?? []) as Employee[], byEmp };
    },
  });

  useEffect(() => {
    if (!data) return;
    const seed: Record<string, Draft> = {};
    for (const e of data.employees) {
      const a = data.byEmp[e.id];
      seed[e.id] = {
        entry_time: a?.entry_time ?? "",
        exit_time: a?.exit_time ?? "",
        status: a?.status ?? "",
        remarks: a?.remarks ?? "",
      };
    }
    // Reseed the editable draft whenever the selected date's data loads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(seed);
  }, [data]);

  const employees = data?.employees ?? [];
  const pages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const rows = useMemo(() => employees.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [employees, page]);

  function edit(id: string, key: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [id]: { ...(d[id] ?? empty()), [key]: value } }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const { data: orgId } = await supabase.rpc("my_org");
      const ups = employees
        .map((e) => ({ e, d: draft[e.id] ?? empty() }))
        .filter(({ d }) => d.entry_time || d.exit_time || d.status || d.remarks)
        .map(({ e, d }) => ({
          employee_id: e.id,
          att_date: date,
          org_id: orgId,
          entry_time: d.entry_time || null,
          exit_time: d.exit_time || null,
          status: d.status || null,
          remarks: d.remarks || null,
        }));
      if (!ups.length) throw new Error("Nothing to save — mark at least one employee.");
      const { error } = await supabase.from("attendance").upsert(ups, { onConflict: "employee_id,att_date" });
      if (error) throw error;
      return ups.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance", date] }),
  });

  const weekend = [0, 6].includes(new Date(date).getDay());

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Daily Attendance</h1>
          <p className="mt-1 text-sm text-muted">Track and manage daily attendance for your team.</p>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save All"}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-muted">Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(0);
          }}
          className="w-auto"
        />
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${weekend ? "bg-brand-soft text-brand-dark" : "bg-emerald-50 text-emerald-700"}`}
        >
          {new Date(date).toLocaleDateString("en-IN", { weekday: "long" })} {weekend ? "— Weekend" : "— Working day"}
        </span>
      </div>

      {save.isError && <p className="mb-3 text-sm font-medium text-brand-dark">{(save.error as Error).message}</p>}
      {save.isSuccess && <p className="mb-3 text-sm font-medium text-emerald-700">Saved {save.data} record(s).</p>}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {rows.map((e) => {
                const d = draft[e.id] ?? empty();
                return (
                  <tr key={e.id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={initials(e.full_name)} />
                        <span className="font-semibold text-ink">{e.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted">{e.department ?? "—"}</td>
                    <td className="px-4 py-2">
                      <Input type="time" value={d.entry_time} onChange={(ev) => edit(e.id, "entry_time", ev.target.value)} className="w-28" />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="time" value={d.exit_time} onChange={(ev) => edit(e.id, "exit_time", ev.target.value)} className="w-28" />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={d.status} onChange={(ev) => edit(e.id, "status", ev.target.value)} className="w-40">
                        {STATUS.map(([v, label]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Input value={d.remarks} onChange={(ev) => edit(e.id, "remarks", ev.target.value)} placeholder="—" />
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
