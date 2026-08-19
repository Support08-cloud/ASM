import { prisma } from "./prisma";

export async function getSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.setting.create({
    data: {
      id: "default",
      demoOtp: process.env.DEMO_OTP !== "false",
      msg91AuthKey: process.env.MSG91_AUTH_KEY || "",
      msg91TemplateId: process.env.MSG91_TEMPLATE_ID || "",
      msg91SenderId: process.env.MSG91_SENDER_ID || "V360ASM",
    },
  });
}
