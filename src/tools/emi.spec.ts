import { computeEmi } from "./emi";

describe("computeEmi", () => {
  it("computes a standard reducing-balance EMI", () => {
    const r = computeEmi({
      principal: 100000,
      annualRate: 10.5,
      tenureMonths: 60,
    });
    expect(r.emi).toBe(2149);
    expect(r.totalAmount).toBe(2149 * 60);
    expect(r.totalInterest).toBe(2149 * 60 - 100000);
  });

  it("degrades to straight-line repayment at 0% interest", () => {
    const r = computeEmi({ principal: 120000, annualRate: 0, tenureMonths: 12 });
    expect(r.emi).toBe(10000);
    expect(r.totalInterest).toBe(0);
    expect(r.totalAmount).toBe(120000);
  });

  it("never returns negative interest", () => {
    const r = computeEmi({ principal: 5000, annualRate: 1, tenureMonths: 1 });
    expect(r.totalInterest).toBeGreaterThanOrEqual(0);
  });
});
