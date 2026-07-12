// Merik — Payroll Edge Function (Deno)
// All salary math runs here (server-side), never in the browser.
// Actions:
//   { action: "compute", year, month }        -> draft rows (saved row if present, else auto-filled from CTC + attendance)
//   { action: "save", year, month, rows: [] }  -> validates, recomputes derived totals, upserts payroll
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

// Auto-fill a payroll row from CTC + unpaid days — ported from the legacy autoPay().
function autoFill(ctc: number | null, y: number, m: number, unpaid: number) {
  const dim = daysInMonth(y, m);
  const total_days = dim;
  const paid_days = dim - unpaid;
  if (!ctc) return { total_days, paid_days, basic: 0, hra: 0, other_allowance: 0, pt: 0, lop: 0, incentives: 0, arrears: 0 };
  const g = Number(ctc);
  const f = total_days ? paid_days / total_days : 1;
  return {
    total_days,
    paid_days,
    basic: Math.round(g * 0.5),
    hra: Math.round(g * 0.2),
    other_allowance: Math.round(g * 0.3),
    pt: g > 20000 ? 200 : g > 15000 ? 150 : 0,
    lop: Math.round(g * (1 - f)),
    incentives: 0,
    arrears: 0,
  };
}

// Derived totals — single source of truth, computed here so the DB never stores inconsistent numbers.
function derive(r: { basic: number; hra: number; other_allowance: number; incentives: number; arrears: number; pt: number; lop: number }) {
  const gross = r.basic + r.hra + r.other_allowance;
  const gross_additions = gross + r.incentives + r.arrears;
  const total_deductions = r.pt + r.lop;
  return { gross, gross_additions, total_deductions, net: gross_additions - total_deductions };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const year = num(body.year);
    const month = num(body.month);
    if (!year || month < 1 || month > 12) return json({ error: "Invalid year/month" }, 400);
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const dim = daysInMonth(year, month);

    if (body.action === "compute") {
      const [{ data: emps, error: e1 }, { data: saved, error: e2 }, { data: att, error: e3 }] = await Promise.all([
        supabase.from("employees").select("id, emp_code, full_name, ctc, email").eq("status", "Active").order("emp_code"),
        supabase.from("payroll").select("*").eq("pay_year", year).eq("pay_month", month),
        supabase.from("attendance").select("employee_id, status").gte("att_date", `${ym}-01`).lte("att_date", `${ym}-${dim}`),
      ]);
      if (e1 || e2 || e3) return json({ error: (e1 || e2 || e3)?.message }, 400);

      const savedByEmp: Record<string, Record<string, unknown>> = {};
      (saved ?? []).forEach((r) => (savedByEmp[r.employee_id as string] = r));

      const unpaidByEmp: Record<string, number> = {};
      (att ?? []).forEach((a) => {
        const s = a.status;
        const inc = s === "A" || s === "UL" ? 1 : s === "H" ? 0.5 : 0;
        unpaidByEmp[a.employee_id as string] = (unpaidByEmp[a.employee_id as string] ?? 0) + inc;
      });

      const rows = (emps ?? []).map((e) => {
        const existing = savedByEmp[e.id as string];
        const base = existing
          ? {
              total_days: num(existing.total_days),
              paid_days: num(existing.paid_days),
              basic: num(existing.basic),
              hra: num(existing.hra),
              other_allowance: num(existing.other_allowance),
              pt: num(existing.pt),
              lop: num(existing.lop),
              incentives: num(existing.incentives),
              arrears: num(existing.arrears),
            }
          : autoFill(e.ctc as number | null, year, month, unpaidByEmp[e.id as string] ?? 0);
        return {
          employee_id: e.id,
          emp_code: e.emp_code,
          full_name: e.full_name,
          email: e.email,
          ctc: e.ctc,
          auto: !existing,
          pay_status: (existing?.pay_status as string) ?? "Unpaid",
          sent: Boolean(existing?.sent),
          ...base,
          ...derive(base),
        };
      });
      return json({ year, month, rows });
    }

    if (body.action === "save") {
      const { data: orgId } = await supabase.rpc("my_org");
      const inputRows = Array.isArray(body.rows) ? body.rows : [];
      const ups = inputRows
        .map((r: Record<string, unknown>) => {
          const base = {
            basic: num(r.basic),
            hra: num(r.hra),
            other_allowance: num(r.other_allowance),
            incentives: num(r.incentives),
            arrears: num(r.arrears),
            pt: num(r.pt),
            lop: num(r.lop),
          };
          const d = derive(base);
          return {
            employee_id: String(r.employee_id),
            pay_year: year,
            pay_month: month,
            org_id: orgId,
            total_days: num(r.total_days),
            paid_days: num(r.paid_days),
            ...base,
            ...d,
            pay_status: r.pay_status === "Paid" ? "Paid" : "Unpaid",
          };
        })
        .filter((r: { basic: number; paid_days: number }) => r.basic || r.paid_days);

      if (!ups.length) return json({ error: "Nothing to save" }, 400);
      const { error } = await supabase.from("payroll").upsert(ups, { onConflict: "employee_id,pay_year,pay_month" });
      if (error) return json({ error: error.message }, 400);
      return json({ saved: ups.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
