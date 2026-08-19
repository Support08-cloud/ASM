import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { isValidIndianMobile, normalizeName, storePhone } from "@/lib/people";
import { parseAmount, roundMoney } from "@/lib/money";
import { employeeOutstanding, isPrismaCode, readJson, toPublicEmployee } from "@/lib/employees";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const { id } = await context.params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, username: true } },
      advances: {
        orderBy: { issuedAt: "desc" },
        include: { issuedBy: { select: { name: true } } },
      },
      salaryPayouts: {
        orderBy: { paidAt: "desc" },
        include: {
          paidBy: { select: { name: true } },
          deductions: { include: { advance: { select: { receiptNo: true, issuedAt: true } } } },
        },
      },
    },
  });
  if (!employee) return jsonError("Employee not found", 404);
  const outstanding = await employeeOutstanding(employee.id);
  return NextResponse.json({
    employee: {
      ...toPublicEmployee(employee, outstanding),
      createdBy: employee.createdBy,
      advances: employee.advances,
      salaryPayouts: employee.salaryPayouts,
    },
  });
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const { id } = await context.params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return jsonError("Employee not found", 404);
  const body = await readJson(request);
  if (!body) return jsonError("Invalid request");

  const data: {
    name?: string;
    phone?: string;
    department?: string | null;
    designation?: string | null;
    notes?: string | null;
    monthlySalary?: number;
    isActive?: boolean;
  } = {};

  if (typeof body.name === "string") {
    const name = normalizeName(body.name);
    if (!name) return jsonError("Employee name is required");
    data.name = name;
  }
  if (typeof body.phone === "string") {
    const phone = storePhone(body.phone);
    if (!isValidIndianMobile(phone)) return jsonError("Enter a valid 10-digit Indian mobile number");
    data.phone = phone;
  }
  if (body.department !== undefined) data.department = String(body.department || "").trim() || null;
  if (body.designation !== undefined) data.designation = String(body.designation || "").trim() || null;
  if (body.notes !== undefined) data.notes = String(body.notes || "").trim() || null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.monthlySalary !== undefined && body.monthlySalary !== "") {
    try {
      data.monthlySalary = roundMoney(Math.max(0, Number(body.monthlySalary)));
      if (body.monthlySalary !== 0 && body.monthlySalary !== "0") {
        data.monthlySalary = parseAmount(body.monthlySalary as string | number);
      } else {
        data.monthlySalary = 0;
      }
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid salary");
    }
  }

  try {
    const updated = await prisma.employee.update({ where: { id }, data });
    await writeAudit({
      actorId: user.id,
      employeeId: id,
      action: "EMPLOYEE_UPDATED",
      details: data,
    });
    const outstanding = await employeeOutstanding(id);
    return NextResponse.json({ employee: toPublicEmployee(updated, outstanding) });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return jsonError("This mobile number is already registered");
    return jsonError(error instanceof Error ? error.message : "Could not update employee");
  }
}
