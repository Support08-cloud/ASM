export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(value: number, symbol = "₹"): string {
  const n = roundMoney(value);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${symbol}${formatted}`;
}

export function parseAmount(input: string | number): number {
  const n = typeof input === "number" ? input : Number(String(input).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Enter a valid amount greater than 0");
  }
  return roundMoney(n);
}
