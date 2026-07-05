import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { inr } from "@/lib/utils";

export const metadata = { title: "Dashboard — Merik" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: employees }, { data: attToday }, { data: openInvoices }] = await Promise.all([
    supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "Active"),
    supabase.from("attendance").select("status").eq("att_date", today),
    supabase.from("invoices").select("total").in("status", ["Unpaid", "Overdue", "Partially Paid"]),
  ]);

  const present = (attToday ?? []).filter((a) => ["P", "L", "W", "H"].includes(a.status ?? "")).length;
  const outstanding = (openInvoices ?? []).reduce((sum, i) => sum + Number(i.total ?? 0), 0);

  const kpis = [
    { label: "Active Employees", value: employees ?? 0 },
    { label: "Present Today", value: present },
    { label: "Open Invoices", value: (openInvoices ?? []).length },
    { label: "Outstanding", value: inr(outstanding) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Welcome back — here&apos;s what&apos;s happening today.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <div className="text-sm text-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-extrabold text-ink">{k.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
