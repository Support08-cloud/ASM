import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";
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
  if (!employeeId) return jsonError("Select an employee");
  if (!isValidIndianMobile(phone)) return jsonError("Enter the registered 10-digit mobile number");

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.isActive) return jsonError("Employee not found or inactive", 404);
  if (storePhone(employee.phone) !== phone) {
    return jsonError("This mobile number does not match the registered number", 403);
  }

  const recent = await prisma.otpToken.findFirst({
    where: { employeeId, purpose: "PIN_RESET" },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 45_000) {
    return jsonError("Please wait a minute before requesting another OTP");
  }

  const settings = await getSettings();
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + settings.otpExpiryMinutes * 60_000);

  await prisma.otpToken.updateMany({
    where: { employeeId, purpose: "PIN_RESET", consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.otpToken.create({
    data: {
      employeeId,
      phone,
      codeHash: await hashOtp(otp),
      purpose: "PIN_RESET",
      expiresAt,
    },
  });

  const sms = await sendOtpSms({
    phone,
    otp,
    authKey: settings.msg91AuthKey,
    templateId: settings.msg91TemplateId,
    senderId: settings.msg91SenderId,
  });

  await writeAudit({
    actorId: user.id,
    employeeId,
    action: "PIN_OTP_REQUESTED",
    details: { channel: sms.channel, delivered: sms.delivered },
  });

  const demo = settings.demoOtp && (!sms.delivered || sms.channel === "demo");
  return NextResponse.json({
    ok: true,
    channel: sms.channel,
    delivered: sms.delivered,
    expiresInMinutes: settings.otpExpiryMinutes,
    demoOtp: demo ? otp : undefined,
    message: sms.delivered
      ? "OTP sent to the registered mobile number"
      : demo
        ? "OTP is ready. It is shown on screen until phone SMS is connected."
        : sms.error || "Could not send SMS",
  });
}
