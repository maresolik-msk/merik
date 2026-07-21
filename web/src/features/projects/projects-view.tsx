"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { buildClientCodes } from "@/lib/project-label";

type Project = Tables<"projects">;
type Client = Pick<Tables<"clients">, "id" | "name">;
const STATUSES = ["Active", "On Hold", "Completed"];

export function ProjectsView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("Active");

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const [{ data: projects, error: e1 }, { data: clients, error: e2 }] = await Promise.all([
        supabase.from("projects").select("*").order("name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byId: Record<string, string> = {};
      (clients ?? []).forEach((c) => (byId[c.id] = c.name));
      return {
        projects: (projects ?? []) as Project[],
        clients: (clients ?? []) as Client[],
        clientName: byId,
        clientCode: buildClientCodes((clients ?? []) as Client[]),
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Project name is required");
      const { data: orgId } = await supabase.rpc("my_org");
      const { error } = await supabase.from("projects").insert({
        name: name.trim(),
        client_id: clientId || null,
        status,
        org_id: orgId,
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setClientId(""); setStatus("Active"); invalidate(); },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("projects").update({ status: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const projects = data?.projects ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-muted">Manage all projects and their status.</p>
      </div>

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
          <Field label="Project Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Internal —</option>
              {(data?.clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>+ Add</Button>
        </div>
        {add.isError && <p className="mt-2 text-sm text-brand-dark">{(add.error as Error).message}</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">Loading…</td></tr>}
              {!isLoading && projects.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted">No projects yet.</td></tr>}
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <span className="mr-2 rounded bg-soft px-1.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wide text-muted">
                      {p.client_id ? data?.clientCode[p.client_id] ?? "—" : "INT"}
                    </span>
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.client_id ? data?.clientName[p.client_id] ?? "—" : "Internal"}</td>
                  <td className="px-4 py-3">
                    <Select value={p.status} className="w-36 px-2 py-1"
                      onChange={(e) => updateStatus.mutate({ id: p.id, value: e.target.value })}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" className="px-3 py-1 text-xs" disabled={del.isPending}
                      onClick={() => { if (confirm(`Delete project "${p.name}"?`)) del.mutate(p.id); }}>Del</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted">
        Active projects appear as selectable options in the Daily Task Log.
      </p>
    </div>
  );
}
