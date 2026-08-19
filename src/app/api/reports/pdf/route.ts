import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { type ReportPreset, formatDisplayDate, rangeForPreset } from "@/lib/dates";
import { roundMoney } from "@/lib/money";
import { buildUpadReportPdf } from "@/lib/pdf";
import { getSettings } from "@/lib/settings";

function asPreset(value: string | null): ReportPreset {
  if (value === "this_week" || value === "this_month" || value === "last_month" || value === "last_30" || value === "custom") {
    return value;
  }
  return "this_month";
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const preset = asPreset(request.nextUrl.searchParams.get("preset"));
  const employeeId = request.nextUrl.searchParams.get("employeeId") || undefined;

  try {
    const range = rangeForPreset(
      preset,
      request.nextUrl.searchParams.get("from") || undefined,
      request.nextUrl.searchParams.get("to") || undefined,
    );
    const settings = await getSettings();
    const advances = await prisma.advance.findMany({
      where: {
        issuedAt: { gte: range.from, lte: range.to },
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: { issuedAt: "asc" },
      include: {
        employee: { select: { name: true, code: true } },
        issuedBy: { select: { name: true } },
      },
    });

    const pdf = await buildUpadReportPdf({
      companyName: settings.companyName,
      title: "Upad register",
      periodLabel: range.label,
      generatedBy: user.name,
      totalAmount: roundMoney(advances.reduce((s, r) => s + r.amount, 0)),
      totalRemaining: roundMoney(advances.reduce((s, r) => s + r.remainingAmount, 0)),
      rows: advances.map((row) => ({
        date: formatDisplayDate(row.issuedAt),
        receiptNo: row.receiptNo,
        employeeCode: row.employee.code,
        employeeName: row.employee.name,
        amount: row.amount,
        remaining: row.remainingAmount,
        issuedBy: row.issuedBy.name,
        note: row.note,
      })),
    });

    const filename = `vision360-upad-${preset}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not create PDF");
  }
}
