import { describe, expect, it } from "vitest";
import { cn, initials, inr } from "./utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
  });
});

describe("initials", () => {
  it("takes up to two uppercased initials", () => {
    expect(initials("Sanjay Kumar")).toBe("SK");
    expect(initials("madonna")).toBe("M");
    expect(initials("Anita Priya Nair")).toBe("AP");
  });
});

describe("inr", () => {
  it("formats numbers as INR and dashes null/undefined", () => {
    expect(inr(null)).toBe("—");
    expect(inr(undefined)).toBe("—");
    expect(inr(43000)).toContain("43,000");
    expect(inr(43000).startsWith("₹")).toBe(true);
  });
});
