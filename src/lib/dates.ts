export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? 6 : day - 1; // Monday start
  return addDays(d, -diff);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDisplayDateTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date);
}

export function weekLabel(from: Date, to: Date): string {
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

export type ReportPreset = "this_week" | "this_month" | "last_month" | "last_30" | "custom";

export function rangeForPreset(preset: ReportPreset, from?: string, to?: string, now = new Date()): {
  from: Date;
  to: Date;
  label: string;
} {
  if (preset === "this_week") {
    const fromD = startOfWeek(now);
    const toD = endOfDay(now);
    return { from: fromD, to: toD, label: `This week (${weekLabel(fromD, toD)})` };
  }
  if (preset === "this_month") {
    const fromD = startOfMonth(now);
    const toD = endOfDay(now);
    return { from: fromD, to: toD, label: monthLabel(now) };
  }
  if (preset === "last_month") {
    const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { from: startOfMonth(ref), to: endOfMonth(ref), label: monthLabel(ref) };
  }
  if (preset === "last_30") {
    const fromD = startOfDay(addDays(now, -29));
    const toD = endOfDay(now);
    return { from: fromD, to: toD, label: "Last 30 days" };
  }
  if (!from || !to) {
    throw new Error("Choose From and To dates for a custom report");
  }
  const fromD = startOfDay(new Date(from));
  const toD = endOfDay(new Date(to));
  if (fromD.getTime() > toD.getTime()) {
    throw new Error("From date cannot be after To date");
  }
  return { from: fromD, to: toD, label: `${formatDisplayDate(fromD)} to ${formatDisplayDate(toD)}` };
}

export type BucketKind = "day" | "week" | "month";

export function bucketKey(date: Date, kind: BucketKind): string {
  if (kind === "month") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  if (kind === "week") {
    const start = startOfWeek(date);
    return isoDate(start);
  }
  return isoDate(startOfDay(date));
}

export function bucketLabel(key: string, kind: BucketKind): string {
  if (kind === "month") {
    const [y, m] = key.split("-").map(Number);
    return monthLabel(new Date(y, m - 1, 1));
  }
  if (kind === "week") {
    const start = new Date(key);
    return `Week of ${formatDisplayDate(start)}`;
  }
  return formatDisplayDate(new Date(key));
}
