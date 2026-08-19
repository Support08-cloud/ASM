import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { pinLockRemaining, verifyPin } from "./pin";
import { writeAudit } from "./audit";

export async function consumeEmployeePin(input: {
  employeeId: string;
  pin: string;
  actorId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const settings = await getSettings();
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee || !employee.isActive) {
    return { ok: false, error: "Employee not found or inactive", status: 404 };
  }
  if (!employee.pinHash) {
    return { ok: false, error: "This employee has not set a PIN yet", status: 400 };
  }
  const remaining = pinLockRemaining(employee.pinLockedUntil);
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60000);
    return {
      ok: false,
      error: `PIN locked after too many wrong tries. Try again in ${mins} min.`,
      status: 423,
    };
  }

  const match = await verifyPin(input.pin, employee.pinHash);
  if (!match) {
    const attempts = employee.pinFailedAttempts + 1;
    const locked = attempts >= settings.pinMaxAttempts;
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        pinFailedAttempts: locked ? 0 : attempts,
        pinLockedUntil: locked ? new Date(Date.now() + settings.pinLockMinutes * 60_000) : null,
      },
    });
    await writeAudit({
      actorId: input.actorId,
      employeeId: employee.id,
      action: "PIN_FAILED",
      details: { reason: input.reason, attempts, locked },
    });
    if (locked) {
      return {
        ok: false,
        error: `Wrong PIN. Locked for ${settings.pinLockMinutes} minutes. Use Forgot PIN with registered mobile.`,
        status: 423,
      };
    }
    return {
      ok: false,
      error: `Wrong PIN. ${settings.pinMaxAttempts - attempts} tries left.`,
      status: 401,
    };
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: { pinFailedAttempts: 0, pinLockedUntil: null },
  });
  return { ok: true };
}
