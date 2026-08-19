export function digitsOnly(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

export function storePhone(phone: string): string {
  const digits = digitsOnly(phone);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidIndianMobile(phone: string): boolean {
  const digits = storePhone(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

export function displayPhone(phone: string): string {
  const ten = storePhone(phone);
  if (ten.length !== 10) return phone;
  return `${ten.slice(0, 5)} ${ten.slice(5)}`;
}

export function maskPhone(phone: string): string {
  const ten = storePhone(phone);
  if (ten.length !== 10) return phone;
  return `XXXXXX${ten.slice(-4)}`;
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
