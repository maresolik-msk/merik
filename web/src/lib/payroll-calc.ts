// Pure payroll math — mirrors the `payroll` Supabase Edge Function.
// Kept here so the salary formulas are unit-tested and guarded against regressions.

export const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export type PayBase = {
  total_days: number;
  paid_days: number;
  basic: number;
  hra: number;
  other_allowance: number;
  pt: number;
  lop: number;
  incentives: number;
  arrears: number;
};

/** Auto-fill a payroll row from CTC and unpaid days (A/UL = 1, H = 0.5). */
export function autoFill(ctc: number | null, year: number, month: number, unpaid: number): PayBase {
  const dim = daysInMonth(year, month);
  const total_days = dim;
  const paid_days = dim - unpaid;
  if (!ctc) {
    return { total_days, paid_days, basic: 0, hra: 0, other_allowance: 0, pt: 0, lop: 0, incentives: 0, arrears: 0 };
  }
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

/** Derived totals — the single source of truth for gross/deductions/net. */
export function derive(r: Pick<PayBase, "basic" | "hra" | "other_allowance" | "incentives" | "arrears" | "pt" | "lop">) {
  const gross = r.basic + r.hra + r.other_allowance;
  const gross_additions = gross + r.incentives + r.arrears;
  const total_deductions = r.pt + r.lop;
  return { gross, gross_additions, total_deductions, net: gross_additions - total_deductions };
}

/** Unpaid-day weight for an attendance status. */
export const unpaidWeight = (status: string | null) => (status === "A" || status === "UL" ? 1 : status === "H" ? 0.5 : 0);
