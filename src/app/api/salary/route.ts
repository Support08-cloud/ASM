import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { consumeEmployeePin } from "@/lib/pin-guard";
import { nextReceiptNo } from "@/lib/sequences";
import { parseAmount, roundMoney } from "@/lib/money";
import { allocateDeductionsFifo, cashToPay } from "@/lib/finance";
import { monthLabel } from "@/lib/dates";
import { employeeOutstanding, readJson } from "@/lib/employees";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const employeeId = request.nextUrl.searchParams.get("employeeId") || undefined;
  const payouts = await prisma.salaryPayout.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: { paidAt: "desc" },
    take: 200,
    include: {
      employee: { select: { name: true, code: true } },
      paidBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ payouts });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const body = await readJson(request);
  if (!body) return jsonError("Invalid request");

  const employeeId = String(body.employeeId || "");
  const pin = String(body.pin || "");
  const note = String(body.note || "").trim() || null;
  if (!employeeId) return jsonError("Select an employee");

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.isActive) return jsonError("Employee not found or inactive", 404);

  const outstanding = await employeeOutstanding(employeeId);
  let deduct: number;
  try {
    deduct = body.deduct === 0 || body.deduct === "0" ? 0 : parseAmount(body.deduct as string | number);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Enter a valid deduction");
  }

  const gross = employee.monthlySalary;
  if (gross <= 0) return jsonError("Set this employee's monthly salary first");

  let preview;
  try {
    preview = cashToPay(gross, outstanding, deduct);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid deduction");
  }

  const pinResult = await consumeEmployeePin({
    employeeId,
    pin,
    actorId: user.id,
    reason: "SALARY_PAYOUT",
  });
  if (!pinResult.ok) return jsonError(pinResult.error, pinResult.status);

  const open = await prisma.advance.findMany({
    where: { employeeId, status: { in: ["OPEN", "PARTIAL"] } },
    orderBy: { issuedAt: "asc" },
  });

  let allocations: { advanceId: string; amount: number }[] = [];
  try {
    allocations = allocateDeductionsFifo(open, deduct);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not allocate deduction");
  }

  const paidAt = body.paidAt ? new Date(String(body.paidAt)) : new Date();
  const periodLabel = String(body.periodLabel || "").trim() || monthLabel(paidAt);
  const receiptNo = await nextReceiptNo("SAL");

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.salaryPayout.create({
      data: {
        receiptNo,
        employeeId,
        periodLabel,
        grossSalary: preview.salary,
        deducted: preview.deduct,
        netPaid: preview.cashToEmployee,
        paidAt,
        note,
        paidById: user.id,
      },
    });

    for (const row of allocations) {
      await tx.salaryDeduction.create({
        data: {
          salaryPayoutId: created.id,
          advanceId: row.advanceId,
          amount: row.amount,
        },
      });
      const advance = open.find((a) => a.id === row.advanceId);
      if (!advance) continue;
      const remaining = roundMoney(advance.remainingAmount - row.amount);
      await tx.advance.update({
        where: { id: row.advanceId },
        data: {
          remainingAmount: remaining,
          status: remaining <= 0 ? "SETTLED" : "PARTIAL",
        },
      });
    }

    return created;
  });

  await writeAudit({
    actorId: user.id,
    employeeId,
    action: "SALARY_PAID",
    details: {
      receiptNo: payout.receiptNo,
      deducted: payout.deducted,
      netPaid: payout.netPaid,
      remainingAfter: preview.upadRemainingAfter,
    },
  });

  return NextResponse.json({
    payout,
    preview,
    outstandingAfter: preview.upadRemainingAfter,
  });
}
