import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isResponse, requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isResponse(admin)) return admin;
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      actor: { select: { name: true, username: true } },
      employee: { select: { name: true, code: true } },
    },
  });
  return NextResponse.json({ logs });
}
