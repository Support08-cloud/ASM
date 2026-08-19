import bcrypt from "bcryptjs";

const PIN_RE = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export function assertPin(pin: string): string {
  const value = String(pin ?? "").trim();
  if (!isValidPin(value)) {
    throw new Error("PIN must be exactly 4 digits (0-9 only)");
  }
  return value;
}

export function pinPepper(): string {
  return process.env.AUTH_SECRET || process.env.PIN_PEPPER || "vision360-asm-pepper";
}

export async function hashPin(pin: string): Promise<string> {
  const safe = assertPin(pin);
  return bcrypt.hash(`${pinPepper()}:${safe}`, 10);
}

export async function verifyPin(pin: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  try {
    const safe = assertPin(pin);
    return bcrypt.compare(`${pinPepper()}:${safe}`, hash);
  } catch {
    return false;
  }
}

export function pinLockRemaining(lockedUntil: Date | null | undefined, now = new Date()): number {
  if (!lockedUntil) return 0;
  return Math.max(0, lockedUntil.getTime() - now.getTime());
}
