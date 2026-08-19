import bcrypt from "bcryptjs";

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidOtp(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 8);
}

export async function verifyOtpHash(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
