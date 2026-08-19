import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { bucketKey, bucketLabel, type BucketKind, type ReportPreset, rangeForPreset } from "@/lib/dates";
import { formatDisplayDate } from "@/lib/dates";
import { roundMoney } from "@/lib/money";

function asPreset(value: string | null): ReportPreset {
  if (value === "this_week" || value === "this_month" || value === "last_month" || value === "last_30" || value === "custom") {
    return value;
  }
  return "this_month";
}

function asBucket(value: string | null): BucketKind {
  if (value === "day" || value === "week" || value === "month") return value;
  return "week";
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;

  const preset = asPreset(request.nextUrl.searchParams.get("preset"));
  const bucket = asBucket(request.nextUrl.searchParams.get("bucket"));
  const employeeId = request.nextUrl.searchParams.get("employeeId") || undefined;
  try {
    const range = rangeForPreset(
      preset,
      request.nextUrl.searchParams.get("from") || undefined,
      request.nextUrl.searchParams.get("to") || undefined,
    );

    const where = {
      issuedAt: { gte: range.from, lte: range.to },
      ...(employeeId ? { employeeId } : {}),
    };

    const advances = await prisma.advance.findMany({
      where,
      orderBy: { issuedAt: "asc" },
      include: {
        employee: { select: { name: true, code: true, phone: true } },
        issuedBy: { select: { name: true } },
      },
    });

    const payouts = await prisma.salaryPayout.findMany({
      where: {
        paidAt: { gte: range.from, lte: range.to },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { name: true, code: true } },
        paidBy: { select: { name: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    const buckets = new Map<string, { key: string; label: string; count: number; amount: number; remaining: number }>();
    for (const row of advances) {
      const key = bucketKey(row.issuedAt, bucket);
      const current = buckets.get(key) || { key, label: bucketLabel(key, bucket), count: 0, amount: 0, remaining: 0 };
      current.count += 1;
      current.amount = roundMoney(current.amount + row.amount);
      current.remaining = roundMoney(current.remaining + row.remainingAmount);
      buckets.set(key, current);
    }

    const totalAmount = roundMoney(advances.reduce((s, r) => s + r.amount, 0));
    const totalRemaining = roundMoney(advances.reduce((s, r) => s + r.remainingAmount, 0));
    const totalDeducted = roundMoney(payouts.reduce((s, r) => s + r.deducted, 0));
    const totalNetPaid = roundMoney(payouts.reduce((s, r) => s + r.netPaid, 0));

    return NextResponse.json({
      range: { from: range.from, to: range.to, label: range.label },
      bucket,
      totals: {
        count: advances.length,
        amount: totalAmount,
        remaining: totalRemaining,
        salaryPayouts: payouts.length,
        deducted: totalDeducted,
        netPaid: totalNetPaid,
      },
      buckets: [...buckets.values()],
      rows: advances.map((row) => ({
        id: row.id,
        date: formatDisplayDate(row.issuedAt),
        issuedAt: row.issuedAt,
        receiptNo: row.receiptNo,
        employeeCode: row.employee.code,
        employeeName: row.employee.name,
        amount: row.amount,
        remaining: row.remainingAmount,
        status: row.status,
        issuedBy: row.issuedBy.name,
        note: row.note,
      })),
      payouts: payouts.map((row) => ({
        id: row.id,
        date: formatDisplayDate(row.paidAt),
        receiptNo: row.receiptNo,
        employeeCode: row.employee.code,
        employeeName: row.employee.name,
        periodLabel: row.periodLabel,
        grossSalary: row.grossSalary,
        deducted: row.deducted,
        netPaid: row.netPaid,
        paidBy: row.paidBy.name,
      })),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not build report");
  }
}
