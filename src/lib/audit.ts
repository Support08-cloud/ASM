import { prisma } from "./prisma";

export async function writeAudit(input: {
  actorId?: string | null;
  employeeId?: string | null;
  action: string;
  details?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId || null,
      employeeId: input.employeeId || null,
      action: input.action,
      details: input.details == null ? null : JSON.stringify(input.details),
    },
  });
}
