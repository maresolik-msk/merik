"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/database.types";
import { Avatar, Button, Card, Field, Input } from "@/components/ui";
import { initials } from "@/lib/utils";

type Client = Tables<"clients">;
const PAGE_SIZE = 10;

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  contact_person: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  gstin: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});
type ClientInput = z.infer<typeof clientSchema>;
const FIELDS = ["name", "contact_person", "phone", "email", "gstin", "address", "notes"] as const;

export function ClientsView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const stats = {
    total: clients.length,
    email: clients.filter((c) => c.email).length,
    phone: clients.filter((c) => c.phone).length,
  };
  const pages = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const rows = useMemo(() => clients.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE), [clients, page]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-muted">Manage all client information in one place.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Add Client</Button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[["Total Clients", stats.total], ["With Email", stats.email], ["With Phone", stats.phone]].map(([l, v]) => (
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading…</td></tr>}
              {!isLoading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No clients yet.</td></tr>}
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={initials(c.name)} />
                      <span className="font-semibold text-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.contact_person ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{c.gstin ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button>
                      <Button variant="danger" className="px-3 py-1 text-xs" disabled={del.isPending}
                        onClick={() => { if (confirm(`Delete client "${c.name}"?`)) del.mutate(c.id); }}>Del</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {clients.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-end gap-4">
          <span className="text-xs font-semibold text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, clients.length)} of {clients.length}
          </span>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Prev</Button>
          <Button variant="outline" className="px-3 py-1 text-xs" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Next ›</Button>
        </div>
      )}

      {open && (
        <ClientForm
          client={editing}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); queryClient.invalidateQueries({ queryKey: ["clients"] }); }}
        />
      )}
    </div>
  );
}

function ClientForm({ client, onClose, onSaved }: { client: Client | null; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const [form, setForm] = useState<ClientInput>(() => {
    const init = {} as ClientInput;
    FIELDS.forEach((k) => ((init[k] as string) = (client?.[k] as string) ?? ""));
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (input: ClientInput) => {
      const payload = {
        name: input.name,
        contact_person: input.contact_person || null,
        phone: input.phone || null,
        email: input.email || null,
        gstin: input.gstin || null,
        address: input.address || null,
        notes: input.notes || null,
      };
      if (client) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
      } else {
        const { data: orgId } = await supabase.rpc("my_org");
        const insert: TablesInsert<"clients"> = { ...payload, org_id: orgId };
        const { error } = await supabase.from("clients").insert(insert);
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  const set = (k: keyof ClientInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = clientSchema.safeParse(form);
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-ink">{client ? "Edit" : "Add"} client</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Company / Client Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            {errors.name && <span className="text-xs text-brand-dark">{errors.name}</span>}
          </div>
          <Field label="Contact Person"><Input value={form.contact_person ?? ""} onChange={(e) => set("contact_person", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="GSTIN"><Input value={form.gstin ?? ""} onChange={(e) => set("gstin", e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Address"><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Notes"><Input value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field></div>
          {errors.email && <span className="col-span-2 text-xs text-brand-dark">{errors.email}</span>}
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
