import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { hashPin } from "@/lib/pin";
import { nextEmployeeCode } from "@/lib/sequences";
import { isValidIndianMobile, normalizeName, storePhone } from "@/lib/people";
import { parseAmount } from "@/lib/money";
import { isPrismaCode, outstandingMap, readJson, toPublicEmployee } from "@/lib/employees";
import { enableSqliteWal } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  await enableSqliteWal();

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const active = request.nextUrl.searchParams.get("active");
  const where: {
    isActive?: boolean;
    OR?: { name?: { contains: string }; phone?: { contains: string }; code?: { contains: string } }[];
  } = {};
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;
  if (q) {
    const phone = storePhone(q);
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q.toUpperCase() } },
      { phone: { contains: phone || q } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { name: "asc" },
    take: 300,
  });
  const due = await outstandingMap(employees.map((e) => e.id));
  return NextResponse.json({
    employees: employees.map((e) => toPublicEmployee(e, due.get(e.id) || 0)),
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const body = await readJson(request);
  if (!body) return jsonError("Invalid request");

  const name = normalizeName(String(body.name || ""));
  const phone = storePhone(String(body.phone || ""));
  const pin = String(body.pin || "");
  const pinConfirm = String(body.pinConfirm || pin);
  const department = String(body.department || "").trim() || null;
  const designation = String(body.designation || "").trim() || null;
  const notes = String(body.notes || "").trim() || null;
  if (!name) return jsonError("Employee name is required");
  if (!isValidIndianMobile(phone)) return jsonError("Enter a valid 10-digit Indian mobile number");
  if (pin !== pinConfirm) return jsonError("PIN and confirm PIN do not match");

  let monthlySalary = 0;
  if (body.monthlySalary !== undefined && body.monthlySalary !== "" && body.monthlySalary !== null) {
    try {
      monthlySalary = parseAmount(body.monthlySalary as string | number);
    } catch {
      monthlySalary = Number(body.monthlySalary) === 0 ? 0 : NaN;
    }
    if (!Number.isFinite(monthlySalary) || monthlySalary < 0) return jsonError("Enter a valid salary amount");
  }

  try {
    const hashed = await hashPin(pin);
    const created = await prisma.employee.create({
      data: {
        code: await nextEmployeeCode(),
        name,
        phone,
        department,
        designation,
        monthlySalary,
        notes,
        pinHash: hashed,
        pinSetAt: new Date(),
        createdById: user.id,
      },
    });
    await writeAudit({
      actorId: user.id,
      employeeId: created.id,
      action: "EMPLOYEE_CREATED",
      details: { name: created.name, code: created.code },
    });
    return NextResponse.json({ employee: toPublicEmployee(created, 0) });
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      return jsonError("This mobile number is already registered");
    }
    return jsonError(error instanceof Error ? error.message : "Could not add employee");
  }
}

export async function PATCH() {
  return jsonError("Use /api/employees/[id] to update", 405);
}
