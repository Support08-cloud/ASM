import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, jsonError, requireAdmin, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { writeAudit } from "@/lib/audit";
import { readJson } from "@/lib/employees";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (isResponse(user)) return user;
  const settings = await getSettings();
  return NextResponse.json({
    settings: {
      ...settings,
      msg91AuthKey: settings.msg91AuthKey ? "••••••••" : "",
      hasMsg91: Boolean(settings.msg91AuthKey),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isResponse(admin)) return admin;
  const body = await readJson(request);
  if (!body) return jsonError("Invalid request");
  const current = await getSettings();

  const data: Record<string, unknown> = {};
  if (typeof body.companyName === "string") data.companyName = body.companyName.trim() || "Vision 360";
  if (typeof body.companyTagline === "string") data.companyTagline = body.companyTagline.trim();
  if (typeof body.currencySymbol === "string") data.currencySymbol = body.currencySymbol.trim() || "₹";
  if (typeof body.demoOtp === "boolean") data.demoOtp = body.demoOtp;
  if (body.maxAdvancePercent !== undefined) data.maxAdvancePercent = Math.max(10, Math.min(200, Number(body.maxAdvancePercent) || 100));
  if (body.pinMaxAttempts !== undefined) data.pinMaxAttempts = Math.max(3, Math.min(10, Number(body.pinMaxAttempts) || 5));
  if (body.pinLockMinutes !== undefined) data.pinLockMinutes = Math.max(5, Math.min(60, Number(body.pinLockMinutes) || 15));
  if (body.otpExpiryMinutes !== undefined) data.otpExpiryMinutes = Math.max(2, Math.min(15, Number(body.otpExpiryMinutes) || 5));
  if (typeof body.msg91TemplateId === "string") data.msg91TemplateId = body.msg91TemplateId.trim();
  if (typeof body.msg91SenderId === "string") data.msg91SenderId = body.msg91SenderId.trim() || "V360ASM";
  if (typeof body.msg91AuthKey === "string" && !body.msg91AuthKey.includes("•")) {
    data.msg91AuthKey = body.msg91AuthKey.trim();
  }

  const settings = await prisma.setting.update({
    where: { id: current.id },
    data,
  });
  await writeAudit({ actorId: admin.id, action: "SETTINGS_UPDATED" });
  return NextResponse.json({
    settings: {
      ...settings,
      msg91AuthKey: settings.msg91AuthKey ? "••••••••" : "",
      hasMsg91: Boolean(settings.msg91AuthKey),
    },
  });
}
