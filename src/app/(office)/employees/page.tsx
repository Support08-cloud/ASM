"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, inr, type PublicEmployee } from "@/lib/client";
import { Badge, Button, Card, Input } from "@/components/ui";

export default function EmployeesPage() {
  const [q, setQ] = useState("");
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ employees: PublicEmployee[] }>(`/api/employees?q=${encodeURIComponent(q)}`)
        .then((data) => setEmployees(data.employees))
        .catch(() => setEmployees([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const totalDue = useMemo(() => employees.reduce((s, e) => s + e.outstanding, 0), [employees]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Employees</h2>
          <p className="text-sm text-stone">Search a name like opening their diary page. Outstanding: {inr(totalDue)}</p>
        </div>
        <Link href="/employees/new">
          <Button>Add employee</Button>
        </Link>
      </div>
      <Input placeholder="Search name, mobile or EMP code" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-ink text-white">
            <tr className="text-left text-[11px] uppercase tracking-[0.14em]">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Mobile</th>
              <th className="px-4 py-3">Salary</th>
              <th className="px-4 py-3">Upad remaining</th>
              <th className="px-4 py-3">Cash if full cut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-stone">
                    {row.code}
                    {row.department ? ` · ${row.department}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">{inr(row.monthlySalary)}</td>
                <td className="px-4 py-3 font-semibold text-copper">{inr(row.outstanding)}</td>
                <td className="px-4 py-3">{inr(row.netSalaryIfFullCut)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Badge tone={row.pinSet ? "ok" : "danger"}>{row.pinSet ? "PIN" : "No PIN"}</Badge>
                    <Link href={`/employees/${row.id}`} className="text-sm font-semibold text-copper hover:underline">
                      Open page
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone">
                  No employees found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
