import { describe, expect, it } from "vitest";
import { autoFill, derive, daysInMonth, unpaidWeight } from "./payroll-calc";

describe("daysInMonth", () => {
  it("handles 31/30/28-day months", () => {
    expect(daysInMonth(2026, 7)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
  });
});

describe("unpaidWeight", () => {
  it("weights A and UL as 1, H as 0.5, others 0", () => {
    expect(unpaidWeight("A")).toBe(1);
    expect(unpaidWeight("UL")).toBe(1);
    expect(unpaidWeight("H")).toBe(0.5);
    expect(unpaidWeight("P")).toBe(0);
    expect(unpaidWeight(null)).toBe(0);
  });
});

describe("autoFill", () => {
  it("splits CTC into basic/HRA/other and applies PT slab (July, no unpaid)", () => {
    const r = autoFill(43000, 2026, 7, 0);
    expect(r.total_days).toBe(31);
    expect(r.paid_days).toBe(31);
    expect(r.basic).toBe(21500);
    expect(r.hra).toBe(8600);
    expect(r.other_allowance).toBe(12900);
    expect(r.pt).toBe(200); // > 20000
    expect(r.lop).toBe(0);
  });

  it("applies the mid PT slab and LOP from unpaid days", () => {
    const r = autoFill(16000, 2026, 7, 31 * 0.5); // half the month unpaid → f = 0.5
    expect(r.pt).toBe(150); // 15000 < g <= 20000
    expect(r.lop).toBe(Math.round(16000 * 0.5));
  });

  it("returns zeros for employees without a CTC", () => {
    const r = autoFill(null, 2026, 7, 2);
    expect(r.basic).toBe(0);
    expect(r.paid_days).toBe(29);
  });
});

describe("derive", () => {
  it("computes gross, additions, deductions and net", () => {
    const d = derive({ basic: 21500, hra: 8600, other_allowance: 12900, incentives: 1000, arrears: 500, pt: 200, lop: 0 });
    expect(d.gross).toBe(43000);
    expect(d.gross_additions).toBe(44500);
    expect(d.total_deductions).toBe(200);
    expect(d.net).toBe(44300);
  });
});
