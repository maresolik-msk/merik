"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, Select, Textarea } from "@/components/ui";

type Row = {
  id: string;
  created_at: string;
  category: string;
  message: string;
  status: string;
  admin_reply: string | null;
  employee_id: string | null;
};
type Emp = { id: string; full_name: string; emp_code: string };

const CATEGORIES = ["Product", "Bug", "Feature Request", "Other"];
const STATUSES = ["New", "In Review", "Resolved"];

function tone(status: string) {
  return status === "Resolved" ? "green" : status === "In Review" ? "gray" : "red";
}

export function FeedbackView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["feedback"],
    queryFn: async () => {
      const [{ data: rows, error: e1 }, { data: employees, error: e2 }] = await Promise.all([
        supabase.from("feedback").select("*").order("created_at", { ascending: false }),
        supabase.from("employees").select("id, full_name, emp_code"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const empById: Record<string, Emp> = {};
      (employees ?? []).forEach((e) => (empById[e.id] = e));
      return { rows: (rows ?? []) as Row[], empById };
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!message.trim()) throw new Error("Please write your feedback.");
      const { data: orgId } = await supabase.rpc("my_org");
      const { data: employeeId } = await supabase.rpc("my_employee_id");
      const { error } = await supabase
        .from("feedback")
        .insert({ org_id: orgId, employee_id: employeeId, category, message: message.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const saveReply = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await supabase.from("feedback").update({ admin_reply: reply || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const rows = data?.rows ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Feedback</h1>
        <p className="mt-1 text-sm text-muted">Share feedback or a feature request, and track what your team has raised.</p>
      </div>

      <Card className="mb-6">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Textarea
            rows={3}
            placeholder="Describe your feedback or requirement…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        {submit.isError && (
          <p className="mb-2 text-sm font-medium text-brand-dark">{(submit.error as Error).message}</p>
        )}
        <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : "Submit Feedback"}
        </Button>
      </Card>

      {error && <p className="mb-3 text-sm font-medium text-brand-dark">{(error as Error).message}</p>}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Feedback</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reply</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">Loading…</td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">No feedback submitted yet.</td>
                </tr>
              )}
              {rows.map((r) => {
                const emp = r.employee_id ? data?.empById[r.employee_id] : undefined;
                return (
                  <tr key={r.id} className="border-b border-line/70 last:border-0 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                      {emp ? `${emp.full_name} (${emp.emp_code})` : "Admin"}
                    </td>
                    <td className="px-4 py-3 text-muted">{r.category}</td>
                    <td className="px-4 py-3 max-w-xs text-ink">{r.message}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={r.status}
                        onChange={(e) => setStatus.mutate({ id: r.id, status: e.target.value })}
                        className="w-32 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </Select>
                      <div className="mt-1">
                        <Badge tone={tone(r.status)}>{r.status}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="Reply…"
                        defaultValue={r.admin_reply ?? ""}
                        onChange={(e) => setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        onBlur={(e) => saveReply.mutate({ id: r.id, reply: replyDraft[r.id] ?? e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
