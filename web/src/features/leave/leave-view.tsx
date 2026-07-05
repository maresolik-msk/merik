"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { Badge, Button, Card } from "@/components/ui";

type Leave = Tables<"wfh_leave">;
type Emp = Pick<Tables<"employees">, "id" | "full_name" | "emp_code">;
const PAGE_SIZE = 12;

export function LeaveView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["leave"],
    queryFn: async () => {
      const [{ data: requests, error: e1 }, { data: employees, error: e2 }] = await Promise.all([
        supabase.from("wfh_leave").select("*").order("req_date", { ascending: false }).limit(200),
        supabase.from("employees").select("id, full_name, emp_code"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const empById: Record<string, Emp> = {};
      (employees ?? []).forEach((e) => (empById[e.id] = e));
      return { requests: (requests ?? []) as Leave[], empById };
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: "Yes" | "No" }) => {
      const { error } = await supabase.from("wfh_leave").update({ approved: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave"] }),
  });

  const requests = data?.requests ?? [];
  const pages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const rows = useMemo(() => requests.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [requests, page]);

  function tone(v: string | null) {
    return v === "Yes" ? "green" : v === "No" ? "red" : "gray";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">WFH &amp; Leave</h1>
        <p className="mt-1 text-sm text-muted">Review and approve work-from-home and leave requests.</p>
      </div>

      <div className="mb-4 rounded-lg border-l-4 border-brand bg-brand-soft px-4 py-2.5 text-sm text-brand-dark">
        Only management-approved WFH/Leave is valid. Late intimation is not accepted (due before 8:00 AM).
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3"></th>
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
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No requests yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const emp = data?.empById[r.employee_id];
                return (
                  <tr key={r.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{r.req_date}</td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {emp ? `${emp.full_name} (${emp.emp_code})` : "—"}
                    </td>
                    <td className="px-4 py-3">{r.status}</td>
                    <td className="px-4 py-3 text-muted">{r.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={tone(r.approved)}>{r.approved ?? "Pending"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.approved === "Pending" || !r.approved) && (
                        <div className="flex justify-end gap-2">
                          <Button
                            className="px-3 py-1 text-xs"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: r.id, value: "Yes" })}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3 py-1 text-xs"
                            disabled={decide.isPending}
                            onClick={() => decide.mutate({ id: r.id, value: "No" })}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {requests.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <span className="text-xs font-semibold text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, requests.length)} of {requests.length}
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
