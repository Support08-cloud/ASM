import { prisma } from "./prisma";

function yyyymmdd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export async function nextEmployeeCode(): Promise<string> {
  const last = await prisma.employee.findFirst({
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const n = last?.code?.match(/(\d+)$/) ? Number(last.code.match(/(\d+)$/)![1]) + 1 : 1;
  return `EMP-${String(n).padStart(4, "0")}`;
}

export async function nextReceiptNo(kind: "UPD" | "SAL"): Promise<string> {
  const day = yyyymmdd();
  const prefix = `${kind}-${day}-`;
  const last =
    kind === "UPD"
      ? await prisma.advance.findFirst({
          where: { receiptNo: { startsWith: prefix } },
          orderBy: { receiptNo: "desc" },
          select: { receiptNo: true },
        })
      : await prisma.salaryPayout.findFirst({
          where: { receiptNo: { startsWith: prefix } },
          orderBy: { receiptNo: "desc" },
          select: { receiptNo: true },
        });
  const n = last?.receiptNo ? Number(last.receiptNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}
