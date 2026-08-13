"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";

type Asset = Tables<"digital_assets">;
type Incident = Tables<"incidents">;

const KINDS = ["website", "webapp", "api", "mobile_backend", "internal"] as const;
const ENVIRONMENTS = ["production", "staging"] as const;
const CRITICALITIES = ["critical", "high", "normal", "low"] as const;
const SLA_TIERS = ["99.99", "99.9", "99.5", "99.0", "best_effort"] as const;

const assetSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  // Checks are only as good as the URL. A typo'd host looks exactly like an
  // outage, so this is validated here rather than discovered at 3am.
  primary_url: z.string().trim().url("Enter a full URL, e.g. https://example.com").or(z.literal("")),
  kind: z.enum(KINDS),
  environment: z.enum(ENVIRONMENTS),
  criticality: z.enum(CRITICALITIES),
  sla_tier: z.enum(SLA_TIERS),
  client_id: z.string(),
  project_id: z.string(),
  owner_employee_id: z.string(),
});
type AssetInput = z.infer<typeof assetSchema>;

const STATUS_TONE: Record<string, "green" | "red" | "gray"> = {
  operational: "green",
  down: "red",
  degraded: "red",
  maintenance: "gray",
  unknown: "gray",
};
const SEVERITY_LABEL: Record<number, string> = { 1: "Sev1", 2: "Sev2", 3: "Sev3", 4: "Sev4" };

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export function OperationsView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Asset | null>(null);
  const [open, setOpen] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["digital_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_assets")
        .select("*")
        .is("archived_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    // The probe writes status from Postgres, so the page has to re-read to see
    // it. Cheap query, and a stale "operational" is the one value that must not
    // linger on this page.
    refetchInterval: 60_000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .neq("state", "resolved")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await supabase.from("projects").select("id, name").order("name")).data ?? [],
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", "names"],
    queryFn: async () =>
      (await supabase.from("employees").select("id, full_name").order("full_name")).data ?? [],
  });

  const nameOf = useMemo(() => ({
    client: new Map(clients.map((c) => [c.id, c.name])),
    project: new Map(projects.map((p) => [p.id, p.name])),
    employee: new Map(employees.map((e) => [e.id, e.full_name])),
    asset: new Map(assets.map((a) => [a.id, a.name])),
  }), [clients, projects, employees, assets]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("digital_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["digital_assets"] }),
  });

  const setIncidentState = useMutation({
    mutationFn: async ({ id, state }: { id: string; state: "acknowledged" | "resolved" }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("incidents")
        .update({
          state,
          updated_at: now,
          ...(state === "acknowledged" ? { acknowledged_at: now } : { resolved_at: now }),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents", "open"] }),
  });

  const stats = {
    total: assets.length,
    operational: assets.filter((a) => a.status === "operational").length,
    down: assets.filter((a) => a.status === "down").length,
    incidents: incidents.length,
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Digital Operations</h1>
          <p className="mt-1 text-sm text-muted">
            Every site and API you look after, who owns it, and whether it&apos;s up right now.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Add Asset</Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          ["Assets", stats.total],
          ["Operational", stats.operational],
          ["Down", stats.down],
          ["Open Incidents", stats.incidents],
        ] as const).map(([label, value]) => (
          <Card key={label}>
            <div className="text-sm text-muted">{label}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{value}</div>
          </Card>
        ))}
      </div>

      {incidents.length > 0 && (
        <Card className="mb-5 p-0">
          <div className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink">
            Open incidents
          </div>
          {incidents.map((i: Incident) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-3 last:border-0">
              <Badge tone={i.severity <= 2 ? "red" : "gray"}>{SEVERITY_LABEL[i.severity] ?? "Sev3"}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-ink">{i.title}</div>
                <div className="text-xs text-muted">
                  {nameOf.asset.get(i.asset_id) ?? "—"} · started {ago(i.started_at)} ago ·{" "}
                  {i.assigned_employee_id
                    ? `assigned to ${nameOf.employee.get(i.assigned_employee_id) ?? "—"}`
                    : "unassigned"}
                  {i.cause_category ? ` · failed at ${i.cause_category}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                {i.state === "detected" && (
                  <Button
                    variant="outline"
                    className="px-3 py-1 text-xs"
                    disabled={setIncidentState.isPending}
                    onClick={() => setIncidentState.mutate({ id: i.id, state: "acknowledged" })}
                  >
                    Acknowledge
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="px-3 py-1 text-xs"
                  disabled={setIncidentState.isPending}
                  onClick={() => setIncidentState.mutate({ id: i.id, state: "resolved" })}
                >
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">SLA</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading…</td></tr>
              )}
              {!isLoading && assets.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No assets yet. Add a site or API to start monitoring it.
                </td></tr>
              )}
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{a.name}</div>
                    <div className="text-xs text-muted">
                      {a.primary_url ?? "no URL — not monitored"}
                      {a.environment === "staging" ? " · staging" : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.client_id ? nameOf.client.get(a.client_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.owner_employee_id ? nameOf.employee.get(a.owner_employee_id) ?? "—" : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {a.sla_tier === "best_effort" ? "Best effort" : `${a.sla_tier}%`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[a.status] ?? "gray"}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="px-3 py-1 text-xs"
                        onClick={() => { setEditing(a); setOpen(true); }}>Edit</Button>
                      <Button variant="danger" className="px-3 py-1 text-xs" disabled={del.isPending}
                        onClick={() => { if (confirm(`Delete asset "${a.name}"?`)) del.mutate(a.id); }}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <AssetForm
          asset={editing}
          clients={clients}
          projects={projects}
          employees={employees}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["digital_assets"] });
          }}
        />
      )}
    </div>
  );
}

function AssetForm({
  asset, clients, projects, employees, onClose, onSaved,
}: {
  asset: Asset | null;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<AssetInput>({
    name: asset?.name ?? "",
    primary_url: asset?.primary_url ?? "",
    kind: (asset?.kind as AssetInput["kind"]) ?? "website",
    environment: (asset?.environment as AssetInput["environment"]) ?? "production",
    criticality: (asset?.criticality as AssetInput["criticality"]) ?? "normal",
    sla_tier: (asset?.sla_tier as AssetInput["sla_tier"]) ?? "99.9",
    client_id: asset?.client_id ?? "",
    project_id: asset?.project_id ?? "",
    owner_employee_id: asset?.owner_employee_id ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (input: AssetInput) => {
      const payload = {
        name: input.name,
        primary_url: input.primary_url || null,
        kind: input.kind,
        environment: input.environment,
        criticality: input.criticality,
        sla_tier: input.sla_tier,
        client_id: input.client_id || null,
        project_id: input.project_id || null,
        owner_employee_id: input.owner_employee_id || null,
      };
      if (asset) {
        const { error } = await supabase.from("digital_assets").update(payload).eq("id", asset.id);
        if (error) throw error;
      } else {
        const { data: orgId } = await supabase.rpc("my_org");
        const insert: TablesInsert<"digital_assets"> = { ...payload, org_id: orgId };
        const { error } = await supabase.from("digital_assets").insert(insert);
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  const set = (k: keyof AssetInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = assetSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (fe[i.path[0] as string] = i.message));
      setErrors(fe);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-bold text-ink">{asset ? "Edit" : "Add"} digital asset</h2>
        <p className="mb-4 text-xs text-muted">
          Giving it a URL starts an uptime check on it within five minutes.
        </p>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            {errors.name && <span className="text-xs text-brand-dark">{errors.name}</span>}
          </div>
          <div className="col-span-2">
            <Field label="URL">
              <Input value={form.primary_url} placeholder="https://example.com"
                onChange={(e) => set("primary_url", e.target.value)} />
            </Field>
            {errors.primary_url && <span className="text-xs text-brand-dark">{errors.primary_url}</span>}
          </div>

          <Field label="Type">
            <Select value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              {KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
            </Select>
          </Field>
          <Field label="Environment">
            <Select value={form.environment} onChange={(e) => set("environment", e.target.value)}>
              {ENVIRONMENTS.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Field>

          <Field label="Client">
            <Select value={form.client_id} onChange={(e) => set("client_id", e.target.value)}>
              <option value="">—</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Project">
            <Select value={form.project_id} onChange={(e) => set("project_id", e.target.value)}>
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>

          <div className="col-span-2">
            <Field label="Owner — incidents are assigned to this person automatically">
              <Select value={form.owner_employee_id} onChange={(e) => set("owner_employee_id", e.target.value)}>
                <option value="">—</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Criticality">
            <Select value={form.criticality} onChange={(e) => set("criticality", e.target.value)}>
              {CRITICALITIES.map((k) => <option key={k} value={k}>{k}</option>)}
            </Select>
          </Field>
          <Field label="SLA tier">
            <Select value={form.sla_tier} onChange={(e) => set("sla_tier", e.target.value)}>
              {SLA_TIERS.map((k) => (
                <option key={k} value={k}>{k === "best_effort" ? "Best effort" : `${k}%`}</option>
              ))}
            </Select>
          </Field>

          {mutation.isError && (
            <p className="col-span-2 text-sm text-brand-dark">{(mutation.error as Error).message}</p>
          )}
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
