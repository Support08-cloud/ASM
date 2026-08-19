import type { Employee } from "@prisma/client";
import { pinLockRemaining } from "./pin";
import { roundMoney } from "./money";
import { prisma } from "./prisma";
import { outstandingOf } from "./finance";

export type PublicEmployee = {
  id: string;
  code: string;
  name: string;
  phone: string;
  department: string | null;
  designation: string | null;
  monthlySalary: number;
  isActive: boolean;
  joinedAt: Date;
  notes: string | null;
  pinSet: boolean;
  pinSetAt: Date | null;
  pinLocked: boolean;
  createdAt: Date;
  outstanding: number;
  netSalaryIfFullCut: number;
};

export function toPublicEmployee(employee: Employee, outstanding = 0): PublicEmployee {
  return {
    id: employee.id,
    code: employee.code,
    name: employee.name,
    phone: employee.phone,
    department: employee.department,
    designation: employee.designation,
    monthlySalary: employee.monthlySalary,
    isActive: employee.isActive,
    joinedAt: employee.joinedAt,
    notes: employee.notes,
    pinSet: Boolean(employee.pinHash),
    pinSetAt: employee.pinSetAt,
    pinLocked: pinLockRemaining(employee.pinLockedUntil) > 0,
    createdAt: employee.createdAt,
    outstanding,
    netSalaryIfFullCut: roundMoney(Math.max(0, employee.monthlySalary - outstanding)),
  };
}

export async function employeeOutstanding(employeeId: string): Promise<number> {
  const rows = await prisma.advance.findMany({
    where: { employeeId, status: { in: ["OPEN", "PARTIAL"] } },
    select: { remainingAmount: true },
  });
  return outstandingOf(rows);
}

export async function outstandingMap(employeeIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (employeeIds.length === 0) return map;
  const grouped = await prisma.advance.groupBy({
    by: ["employeeId"],
    where: {
      employeeId: { in: employeeIds },
      status: { in: ["OPEN", "PARTIAL"] },
    },
    _sum: { remainingAmount: true },
  });
  for (const row of grouped) {
    map.set(row.employeeId, roundMoney(row._sum.remainingAmount || 0));
  }
  return map;
}

export function serializeEmployee<T extends { monthlySalary: number }>(
  employee: T,
  outstanding: number,
) {
  return {
    ...employee,
    outstanding,
    netSalaryIfFullCut: roundMoney(Math.max(0, employee.monthlySalary - outstanding)),
  };
}

export function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === code;
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
