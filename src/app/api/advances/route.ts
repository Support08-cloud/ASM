import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { consumeEmployeePin } from "@/lib/pin-guard";
import { nextReceiptNo } from "@/lib/sequences";
import { parseAmount } from "@/lib/money";
import { employeeOutstanding, readJson } from "@/lib/employees";
import { getSettings } from "@/lib/settings";
import { warnOverSalary } from "@/lib/finance";
import { endOfDay, startOfDay } from "@/lib/dates";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const employeeId = request.nextUrl.searchParams.get("employeeId") || undefined;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const where: {
    employeeId?: string;
    issuedAt?: { gte: Date; lte: Date };
  } = {};
  if (employeeId) where.employeeId = employeeId;
  if (from && to) where.issuedAt = { gte: startOfDay(new Date(from)), lte: endOfDay(new Date(to)) };

  const advances = await prisma.advance.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    take: 500,
    include: {
      employee: { select: { name: true, code: true, phone: true } },
      issuedBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ advances });
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

  let amount: number;
  try {
    amount = parseAmount(body.amount as string | number);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Enter a valid amount");
  }

  const issuedAt = body.issuedAt ? new Date(String(body.issuedAt)) : new Date();
  if (Number.isNaN(issuedAt.getTime())) return jsonError("Enter a valid date");

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.isActive) return jsonError("Employee not found or inactive", 404);

  const pinResult = await consumeEmployeePin({
    employeeId,
    pin,
    actorId: user.id,
    reason: "ISSUE_UPAD",
  });
  if (!pinResult.ok) return jsonError(pinResult.error, pinResult.status);

  const settings = await getSettings();
  const outstanding = await employeeOutstanding(employeeId);
  const warning = warnOverSalary(outstanding, amount, employee.monthlySalary, settings.maxAdvancePercent);

  const advance = await prisma.advance.create({
    data: {
      receiptNo: await nextReceiptNo("UPD"),
      employeeId,
      amount,
      remainingAmount: amount,
      issuedAt,
      note,
      status: "OPEN",
      issuedById: user.id,
    },
    include: {
      employee: { select: { name: true, code: true, phone: true } },
      issuedBy: { select: { name: true } },
    },
  });

  await writeAudit({
    actorId: user.id,
    employeeId,
    action: "UPAD_ISSUED",
    details: { receiptNo: advance.receiptNo, amount, remainingAfter: outstanding + amount },
  });

  return NextResponse.json({
    advance,
    warning,
    outstandingAfter: outstanding + amount,
  });
}
