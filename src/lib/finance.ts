import { roundMoney } from "./money";

export type AdvanceBalance = {
  id: string;
  issuedAt: Date | string;
  remainingAmount: number;
};

export type DeductionAllocation = {
  advanceId: string;
  amount: number;
};

export function outstandingOf(advances: { remainingAmount: number }[]): number {
  return roundMoney(advances.reduce((sum, row) => sum + (row.remainingAmount || 0), 0));
}

export function allocateDeductionsFifo(
  advances: AdvanceBalance[],
  deductAmount: number,
): DeductionAllocation[] {
  const amount = roundMoney(deductAmount);
  if (amount < 0) {
    throw new Error("Deduction cannot be negative");
  }
  const sorted = [...advances].sort(
    (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
  );
  const open = sorted.filter((row) => roundMoney(row.remainingAmount) > 0);
  const totalOpen = outstandingOf(open);
  if (amount - totalOpen > 0.001) {
    throw new Error("Cannot deduct more than outstanding upad");
  }
  let left = amount;
  const allocations: DeductionAllocation[] = [];
  for (const row of open) {
    if (left <= 0) break;
    const take = roundMoney(Math.min(row.remainingAmount, left));
    if (take > 0) {
      allocations.push({ advanceId: row.id, amount: take });
      left = roundMoney(left - take);
    }
  }
  return allocations;
}

export function salaryNet(grossSalary: number, deducted: number): {
  grossSalary: number;
  deducted: number;
  netPaid: number;
} {
  const gross = roundMoney(grossSalary);
  const cut = roundMoney(deducted);
  if (gross < 0) throw new Error("Salary cannot be negative");
  if (cut < 0) throw new Error("Deduction cannot be negative");
  if (cut - gross > 0.001) {
    throw new Error("Cannot deduct more than this month's salary");
  }
  return { grossSalary: gross, deducted: cut, netPaid: roundMoney(gross - cut) };
}

export function cashToPay(monthlySalary: number, outstanding: number, deduct: number): {
  salary: number;
  outstanding: number;
  deduct: number;
  cashToEmployee: number;
  upadRemainingAfter: number;
} {
  const salary = roundMoney(monthlySalary);
  const due = roundMoney(outstanding);
  const cut = roundMoney(deduct);
  if (cut > due + 0.001) throw new Error("Cannot deduct more than remaining upad");
  const { netPaid } = salaryNet(salary, cut);
  return {
    salary,
    outstanding: due,
    deduct: cut,
    cashToEmployee: netPaid,
    upadRemainingAfter: roundMoney(due - cut),
  };
}

export function warnOverSalary(outstanding: number, newAmount: number, monthlySalary: number, maxPercent = 100): string | null {
  if (!monthlySalary) return null;
  const next = roundMoney(outstanding + newAmount);
  const cap = roundMoney((monthlySalary * maxPercent) / 100);
  if (next > cap + 0.001) {
    return `This upad will take outstanding to more than ${maxPercent}% of monthly salary.`;
  }
  return null;
}
