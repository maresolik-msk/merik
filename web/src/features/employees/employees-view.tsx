"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/database.types";
import { Avatar, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { employeeSchema, type EmployeeInput } from "./schema";
import { initials, inr } from "@/lib/utils";

type Employee = Tables<"employees">;
const PAGE_SIZE = 10;

export function EmployeesView() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("emp_code");
      if (error) throw error;
      return data;
    },
  });

  const pages = Math.max(1, Math.ceil(employees.length / PAGE_SIZE));
  const rows = useMemo(
    () => employees.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [employees, page],
  );

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(emp: Employee) {
    setEditing(emp);
    setOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Employees</h1>
          <p className="mt-1 text-sm text-muted">Manage your team members and their information.</p>
        </div>
        <Button onClick={openAdd}>+ Add Employee</Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-soft text-left text-xs font-bold uppercase tracking-wide text-ink">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">CTC</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No employees yet.
                  </td>
                </tr>
              )}
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line/70 last:border-0 hover:bg-soft/60">
                  <td className="px-4 py-3 text-muted">{e.emp_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={initials(e.full_name)} />
                      <span className="font-semibold text-ink">{e.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{e.department ?? "—"}</td>
                  <td className="px-4 py-3">{e.designation ?? "—"}</td>
                  <td className="px-4 py-3">{inr(e.ctc)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === "Active" ? "green" : "gray"}>{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" className="px-3 py-1 text-xs" onClick={() => openEdit(e)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
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
          <Button
            variant="outline"
            className="px-3 py-1 text-xs"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </Button>
        </div>
      )}

      {open && (
        <EmployeeForm
          employee={editing}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["employees"] });
          }}
        />
      )}
    </div>
  );
}

function EmployeeForm({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<EmployeeInput>({
    emp_code: employee?.emp_code ?? "",
    full_name: employee?.full_name ?? "",
    department: employee?.department ?? "",
    designation: employee?.designation ?? "",
    email: employee?.email ?? "",
    ctc: employee?.ctc ?? undefined,
    status: (employee?.status as "Active" | "Inactive") ?? "Active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const payload = {
        emp_code: input.emp_code,
        full_name: input.full_name,
        department: input.department || null,
        designation: input.designation || null,
        email: input.email || null,
        ctc: input.ctc ?? null,
        status: input.status,
      };
      if (employee) {
        const { error } = await supabase.from("employees").update(payload).eq("id", employee.id);
        if (error) throw error;
      } else {
        const { data: orgId } = await supabase.rpc("my_org");
        const { error } = await supabase.from("employees").insert({ ...payload, org_id: orgId });
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  function set<K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = employeeSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as string] = issue.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-ink">{employee ? "Edit employee" : "Add employee"}</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Employee Code">
            <Input value={form.emp_code} onChange={(e) => set("emp_code", e.target.value)} />
            {errors.emp_code && <span className="text-xs text-brand-dark">{errors.emp_code}</span>}
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value as "Active" | "Inactive")}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label="Full Name">
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
              {errors.full_name && <span className="text-xs text-brand-dark">{errors.full_name}</span>}
            </Field>
          </div>
          <Field label="Department">
            <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
          </Field>
          <Field label="Designation">
            <Input value={form.designation ?? ""} onChange={(e) => set("designation", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <span className="text-xs text-brand-dark">{errors.email}</span>}
          </Field>
          <Field label="Monthly CTC">
            <Input
              type="number"
              value={form.ctc ?? ""}
              onChange={(e) => set("ctc", e.target.value === "" ? undefined : Number(e.target.value))}
            />
            {errors.ctc && <span className="text-xs text-brand-dark">{errors.ctc}</span>}
          </Field>

          {mutation.isError && (
            <p className="col-span-2 text-sm text-brand-dark">{(mutation.error as Error).message}</p>
          )}

          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
