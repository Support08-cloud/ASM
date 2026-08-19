"use client";

import { use, useEffect, useState } from "react";
import { api, type PublicEmployee } from "@/lib/client";
import { EmployeeWorkspace } from "@/components/employee-workspace";
import { Banner, Button, Card, Field, Input } from "@/components/ui";

export default function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [salary, setSalary] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ employee: PublicEmployee }>(`/api/employees/${id}`)
      .then((data) => setSalary(String(data.employee.monthlySalary || "")))
      .catch(() => null);
  }, [id]);

  async function saveSalary() {
    setError(null);
    try {
      await api(`/api/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ monthlySalary: salary || 0 }),
      });
      setSaved("Salary updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save salary");
    }
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-end gap-3">
        <Field label="Update monthly salary (₹)">
          <Input value={salary} onChange={(e) => setSalary(e.target.value)} />
        </Field>
        <Button variant="ghost" onClick={saveSalary}>
          Save salary
        </Button>
        {saved ? <p className="text-sm text-ok">{saved}</p> : null}
        {error ? <Banner kind="error">{error}</Banner> : null}
      </Card>
      <EmployeeWorkspace employeeId={id} />
    </div>
  );
}
