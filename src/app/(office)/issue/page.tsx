"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, inr, type PublicEmployee } from "@/lib/client";
import { Card, Input } from "@/components/ui";
import { EmployeeWorkspace } from "@/components/employee-workspace";

function IssueInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ employees: PublicEmployee[] }>(`/api/employees?q=${encodeURIComponent(q)}&active=true`)
        .then((data) => {
          setEmployees(data.employees);
          if (!selected && data.employees.length === 1) setSelected(data.employees[0].id);
        })
        .catch(() => setEmployees([]));
    }, 180);
    return () => clearTimeout(t);
  }, [q, selected]);

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <h2 className="text-lg font-semibold">Find employee</h2>
        <p className="mb-3 text-sm text-stone">Type the name, same way you used to open their diary page.</p>
        <Input autoFocus placeholder="Name / mobile / code" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-3 max-h-[70vh] space-y-1 overflow-auto">
          {employees.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelected(row.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left ${selected === row.id ? "bg-ink text-white" : "hover:bg-cream"}`}
            >
              <p className="font-medium">{row.name}</p>
              <p className={`text-xs ${selected === row.id ? "text-white/70" : "text-stone"}`}>
                {row.code} · remaining {inr(row.outstanding)}
              </p>
            </button>
          ))}
        </div>
      </Card>
      <div>
        {selected ? (
          <EmployeeWorkspace employeeId={selected} />
        ) : (
          <Card>
            <p className="text-stone">Select an employee to see past upad and give new money with PIN confirmation.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function IssuePage() {
  return (
    <Suspense fallback={<p className="text-stone">Opening counter…</p>}>
      <IssueInner />
    </Suspense>
  );
}
