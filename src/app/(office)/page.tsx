"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, inr } from "@/lib/client";
import { formatDisplayDate } from "@/lib/dates";
import { Card, Stat } from "@/components/ui";

type Dash = {
  kpis: {
    todayAmount: number;
    todayCount: number;
    weekAmount: number;
    weekCount: number;
    monthAmount: number;
    monthCount: number;
    outstanding: number;
    activeEmployees: number;
  };
  recent: Array<{
    id: string;
    receiptNo: string;
    amount: number;
    issuedAt: string;
    employee: { name: string; code: string };
    issuedBy: { name: string };
  }>;
  topOutstanding: Array<{
    employeeId: string;
    outstanding: number;
    employee: { name: string; code: string; monthlySalary: number } | null;
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    api<Dash>("/api/dashboard").then(setData).catch(() => null);
  }, []);

  if (!data) return <p className="text-stone">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today" value={inr(data.kpis.todayAmount)} hint={`${data.kpis.todayCount} upad`} />
        <Stat label="This week" value={inr(data.kpis.weekAmount)} hint={`${data.kpis.weekCount} entries`} />
        <Stat label="This month" value={inr(data.kpis.monthAmount)} hint={`${data.kpis.monthCount} entries`} />
        <Stat label="Still to recover" value={inr(data.kpis.outstanding)} hint={`${data.kpis.activeEmployees} active employees`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Latest upad</h2>
          <div className="mt-4 divide-y divide-line">
            {data.recent.map((row) => (
              <Link key={row.id} href={`/issue?q=${encodeURIComponent(row.employee.name)}`} className="block py-3 hover:bg-cream/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.employee.name}</p>
                    <p className="text-xs text-stone">
                      {row.receiptNo} · {formatDisplayDate(row.issuedAt)} · {row.issuedBy.name}
                    </p>
                  </div>
                  <p className="font-semibold">{inr(row.amount)}</p>
                </div>
              </Link>
            ))}
            {data.recent.length === 0 ? <p className="py-6 text-sm text-stone">No upad yet.</p> : null}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Highest outstanding</h2>
          <div className="mt-4 divide-y divide-line">
            {data.topOutstanding.map((row) => (
              <Link key={row.employeeId} href={`/employees/${row.employeeId}`} className="block py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.employee?.name || "Employee"}</p>
                    <p className="text-xs text-stone">
                      {row.employee?.code} · Salary {inr(row.employee?.monthlySalary || 0)}
                    </p>
                  </div>
                  <p className="font-semibold text-copper">{inr(row.outstanding)}</p>
                </div>
              </Link>
            ))}
            {data.topOutstanding.length === 0 ? <p className="py-6 text-sm text-stone">Nothing outstanding.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
