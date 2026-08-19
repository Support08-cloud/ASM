export function inr(value: number, symbol = "₹"): string {
  const n = Math.round((value + Number.EPSILON) * 100) / 100;
  return `${symbol}${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new ApiError(data.error || "Request failed", res.status);
  }
  return data;
}

export async function downloadPdf(path: string, filename: string) {
  const res = await fetch(path);
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(data.error || "Could not download PDF", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "STAFF";
};

export type PublicEmployee = {
  id: string;
  code: string;
  name: string;
  phone: string;
  department: string | null;
  designation: string | null;
  monthlySalary: number;
  isActive: boolean;
  joinedAt: string;
  notes: string | null;
  pinSet: boolean;
  pinSetAt: string | null;
  pinLocked: boolean;
  createdAt: string;
  outstanding: number;
  netSalaryIfFullCut: number;
};
