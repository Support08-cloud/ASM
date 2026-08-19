"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Banner, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { PinPad } from "@/components/pin-pad";

export default function NewEmployeePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Studio");
  const [designation, setDesignation] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [notes, setNotes] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ employee: { id: string } }>("/api/employees", {
        method: "POST",
        body: JSON.stringify({ name, phone, department, designation, monthlySalary, notes, pin, pinConfirm }),
      });
      router.replace(`/employees/${data.employee.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Register employee</h2>
        <p className="text-sm text-stone">Staff fills the details. The employee themselves must type the 4-digit PIN — this is their signature from now on.</p>
      </div>
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Mobile number" hint="Used for forgot-PIN OTP">
          <Input inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} required />
        </Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {["Studio", "Tech", "Micro", "Measure", "Light", "Reception", "Accounts", "Other"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
        <Field label="Designation">
          <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
        </Field>
        <Field label="Monthly salary (₹)" hint="Used when they come for salary cash">
          <Input inputMode="decimal" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Employee types PIN</h3>
          <PinPad value={pin} onChange={setPin} />
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Confirm PIN</h3>
          <PinPad value={pinConfirm} onChange={setPinConfirm} />
        </Card>
      </div>
      <Button type="submit" disabled={busy || pin.length !== 4 || pin !== pinConfirm}>
        Save employee
      </Button>
    </form>
  );
}
