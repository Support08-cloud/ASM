import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { buildReceiptPdf } from "@/lib/pdf";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";

type Ctx = { params: Promise<{ kind: string; id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const { kind, id } = await context.params;
  const settings = await getSettings();

  if (kind === "upad") {
    const advance = await prisma.advance.findUnique({
      where: { id },
      include: { employee: true, issuedBy: true },
    });
    if (!advance) return jsonError("Receipt not found", 404);
    const pdf = await buildReceiptPdf({
      companyName: settings.companyName,
      kind: "UPAD",
      receiptNo: advance.receiptNo,
      employeeName: advance.employee.name,
      employeeCode: advance.employee.code,
      amount: advance.amount,
      extraLines: [
        { label: "Date", value: formatDisplayDate(advance.issuedAt) },
        { label: "Still outstanding on this", value: formatINR(advance.remainingAmount) },
        { label: "Note", value: advance.note || "—" },
        { label: "Issued by", value: advance.issuedBy.name },
      ],
      confirmedBy: advance.issuedBy.name,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${advance.receiptNo}.pdf"`,
      },
    });
  }

  if (kind === "salary") {
    const payout = await prisma.salaryPayout.findUnique({
      where: { id },
      include: { employee: true, paidBy: true },
    });
    if (!payout) return jsonError("Receipt not found", 404);
    const pdf = await buildReceiptPdf({
      companyName: settings.companyName,
      kind: "SALARY",
      receiptNo: payout.receiptNo,
      employeeName: payout.employee.name,
      employeeCode: payout.employee.code,
      amount: payout.netPaid,
      extraLines: [
        { label: "Period", value: payout.periodLabel },
        { label: "Gross salary", value: formatINR(payout.grossSalary) },
        { label: "Upad deducted", value: formatINR(payout.deducted) },
        { label: "Cash paid", value: formatINR(payout.netPaid) },
        { label: "Paid by", value: payout.paidBy.name },
      ],
      confirmedBy: payout.paidBy.name,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payout.receiptNo}.pdf"`,
      },
    });
  }

  return jsonError("Unknown receipt type", 404);
}
