import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireUser } from "@/lib/auth";
import { startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";
import { roundMoney } from "@/lib/money";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const [today, week, month, outstanding, employees, recent, top] = await Promise.all([
    prisma.advance.aggregate({
      where: { issuedAt: { gte: todayStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.advance.aggregate({
      where: { issuedAt: { gte: weekStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.advance.aggregate({
      where: { issuedAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.advance.aggregate({
      where: { status: { in: ["OPEN", "PARTIAL"] } },
      _sum: { remainingAmount: true },
    }),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.advance.findMany({
      orderBy: { issuedAt: "desc" },
      take: 8,
      include: {
        employee: { select: { name: true, code: true } },
        issuedBy: { select: { name: true } },
      },
    }),
    prisma.advance.groupBy({
      by: ["employeeId"],
      where: { status: { in: ["OPEN", "PARTIAL"] } },
      _sum: { remainingAmount: true },
      orderBy: { _sum: { remainingAmount: "desc" } },
      take: 6,
    }),
  ]);

  const topEmployees = await prisma.employee.findMany({
    where: { id: { in: top.map((t) => t.employeeId) } },
    select: { id: true, name: true, code: true, monthlySalary: true },
  });
  const byId = new Map(topEmployees.map((e) => [e.id, e]));

  return NextResponse.json({
    user,
    kpis: {
      todayAmount: roundMoney(today._sum.amount || 0),
      todayCount: today._count,
      weekAmount: roundMoney(week._sum.amount || 0),
      weekCount: week._count,
      monthAmount: roundMoney(month._sum.amount || 0),
      monthCount: month._count,
      outstanding: roundMoney(outstanding._sum.remainingAmount || 0),
      activeEmployees: employees,
    },
    recent,
    topOutstanding: top.map((row) => ({
      employeeId: row.employeeId,
      outstanding: roundMoney(row._sum.remainingAmount || 0),
      employee: byId.get(row.employeeId) || null,
    })),
  });
}
