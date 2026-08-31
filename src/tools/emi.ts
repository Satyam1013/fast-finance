export interface EmiInput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
}

export interface EmiResult {
  emi: number;
  principal: number;
  totalInterest: number;
  totalAmount: number;
  tenureMonths: number;
  annualRate: number;
}

/**
 * Standard reducing-balance EMI:
 *   EMI = P·r·(1+r)^n / ((1+r)^n − 1),  r = monthly rate, n = months.
 * A zero interest rate degrades to straight-line repayment.
 */
export function computeEmi(input: EmiInput): EmiResult {
  const principal = Math.max(0, input.principal);
  const n = Math.max(1, Math.round(input.tenureMonths));
  const r = input.annualRate / 12 / 100;

  const emiExact =
    r === 0
      ? principal / n
      : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const emi = Math.round(emiExact);
  const totalAmount = emi * n;
  const totalInterest = Math.max(0, totalAmount - principal);

  return {
    emi,
    principal,
    totalInterest,
    totalAmount,
    tenureMonths: n,
    annualRate: input.annualRate,
  };
}
