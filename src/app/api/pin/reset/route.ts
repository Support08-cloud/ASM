import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { hashPin } from "@/lib/pin";
import { isValidOtp, verifyOtpHash } from "@/lib/otp";
import { isValidIndianMobile, storePhone } from "@/lib/people";
import { writeAudit } from "@/lib/audit";
import { readJson } from "@/lib/employees";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const body = await readJson(request);
  if (!body) return jsonError("Invalid request");

  const employeeId = String(body.employeeId || "");
  const phone = storePhone(String(body.phone || ""));
  const otp = String(body.otp || "").trim();
  const pin = String(body.pin || "");
  const pinConfirm = String(body.pinConfirm || pin);
  if (!employeeId) return jsonError("Select an employee");
  if (!isValidIndianMobile(phone)) return jsonError("Enter the registered mobile number");
  if (!isValidOtp(otp)) return jsonError("OTP must be 6 digits");
  if (pin !== pinConfirm) return jsonError("PIN and confirm PIN do not match");

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return jsonError("Employee not found", 404);
  if (storePhone(employee.phone) !== phone) {
    return jsonError("This mobile number does not match the registered number", 403);
  }

  const token = await prisma.otpToken.findFirst({
    where: {
      employeeId,
      purpose: "PIN_RESET",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return jsonError("OTP expired. Request a new one.");
  if (token.attempts >= 5) {
    await prisma.otpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
    return jsonError("Too many wrong OTP tries. Request a new OTP.");
  }

  const match = await verifyOtpHash(otp, token.codeHash);
  if (!match) {
    await prisma.otpToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return jsonError("Wrong OTP", 401);
  }

  try {
    const pinHash = await hashPin(pin);
    await prisma.$transaction([
      prisma.otpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
      prisma.employee.update({
        where: { id: employeeId },
        data: {
          pinHash,
          pinSetAt: new Date(),
          pinFailedAttempts: 0,
          pinLockedUntil: null,
        },
      }),
    ]);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not change PIN");
  }

  await writeAudit({
    actorId: user.id,
    employeeId,
    action: "PIN_RESET",
  });

  return NextResponse.json({ ok: true });
}
