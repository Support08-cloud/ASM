"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, downloadPdf, inr, type PublicEmployee } from "@/lib/client";
import { formatDisplayDate } from "@/lib/dates";
import { cashToPay } from "@/lib/finance";
import { Badge, Banner, Button, Card, Field, Input, Textarea } from "./ui";
import { PinPad } from "./pin-pad";
import { ForgotPin } from "./forgot-pin";

type AdvanceRow = {
  id: string;
  receiptNo: string;
  amount: number;
  remainingAmount: number;
  issuedAt: string;
  note: string | null;
  status: string;
  issuedBy: { name: string };
};

type PayoutRow = {
  id: string;
  receiptNo: string;
  periodLabel: string;
  grossSalary: number;
  deducted: number;
  netPaid: number;
  paidAt: string;
  note: string | null;
  paidBy: { name: string };
};

type Detail = PublicEmployee & {
  advances: AdvanceRow[];
  salaryPayouts: PayoutRow[];
};

export function EmployeeWorkspace({ employeeId }: { employeeId: string }) {
  const [employee, setEmployee] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [deduct, setDeduct] = useState("");
  const [salaryPin, setSalaryPin] = useState("");
  const [salaryNote, setSalaryNote] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<{ employee: Detail }>(`/api/employees/${employeeId}`);
    setEmployee(data.employee);
    const maxCut = Math.min(data.employee.outstanding, data.employee.monthlySalary);
    setDeduct(maxCut ? String(maxCut) : "0");
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const preview = useMemo(() => {
    if (!employee) return null;
    try {
      const cut = deduct === "" || deduct === "0" ? 0 : Number(deduct);
      return cashToPay(employee.monthlySalary, employee.outstanding, cut);
    } catch {
      return null;
    }
  }, [employee, deduct]);

  async function issueUpad() {
    if (!employee) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ warning?: string | null; advance: { receiptNo: string } }>("/api/advances", {
        method: "POST",
        body: JSON.stringify({
          employeeId: employee.id,
          amount,
          issuedAt,
          note,
          pin,
        }),
      });
      setPin("");
      setAmount("");
      setNote("");
      setNotice(`Upad saved as ${data.advance.receiptNo}. PIN confirmed by ${employee.name}.`);
      if (data.warning) setNotice(`${data.advance.receiptNo} saved. ${data.warning}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue upad");
    } finally {
      setBusy(false);
    }
  }

  async function paySalary() {
    if (!employee) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api<{ payout: { receiptNo: string; netPaid: number } }>("/api/salary", {
        method: "POST",
        body: JSON.stringify({
          employeeId: employee.id,
          deduct: deduct === "" ? 0 : Number(deduct),
          note: salaryNote,
          pin: salaryPin,
        }),
      });
      setSalaryPin("");
      setNotice(`Salary paid. Receipt ${data.payout.receiptNo}. Cash to employee ${inr(data.payout.netPaid)}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pay salary");
    } finally {
      setBusy(false);
    }
  }

  if (!employee) {
    return <p className="text-stone">{error || "Opening employee page…"}</p>;
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(135deg,#111_0%,#1c1c1c_60%,#3a2416_100%)] text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-copper">{employee.code}</p>
            <h2 className="mt-1 text-3xl font-semibold">{employee.name}</h2>
            <p className="mt-1 text-sm text-white/70">
              {employee.phone}
              {employee.department ? ` · ${employee.department}` : ""}
              {employee.designation ? ` · ${employee.designation}` : ""}
            </p>
          </div>
          <Badge tone={employee.pinSet ? "ok" : "danger"}>{employee.pinSet ? "PIN set" : "PIN missing"}</Badge>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Mini label="Monthly salary" value={inr(employee.monthlySalary)} />
          <Mini label="Upad remaining" value={inr(employee.outstanding)} />
          <Mini label="If full cut this month" value={inr(employee.netSalaryIfFullCut)} />
          <Mini label="Status" value={employee.isActive ? "Active" : "Inactive"} />
        </div>
      </Card>

      {error ? <Banner kind="error">{error}</Banner> : null}
      {notice ? <Banner kind="ok">{notice}</Banner> : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ledger</h3>
              <p className="text-sm text-stone">This replaces the diary page for this employee.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-stone">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2">By</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...employee.advances.map((row) => ({
                    id: row.id,
                    at: row.issuedAt,
                    kind: "Upad" as const,
                    receiptNo: row.receiptNo,
                    amount: row.amount,
                    extra: `${inr(row.remainingAmount)} left · ${row.status.toLowerCase()}`,
                    by: row.issuedBy.name,
                    href: `/api/receipts/upad/${row.id}`,
                  })),
                  ...employee.salaryPayouts.map((row) => ({
                    id: row.id,
                    at: row.paidAt,
                    kind: "Salary" as const,
                    receiptNo: row.receiptNo,
                    amount: row.netPaid,
                    extra: `Cut ${inr(row.deducted)} · ${row.periodLabel}`,
                    by: row.paidBy.name,
                    href: `/api/receipts/salary/${row.id}`,
                  })),
                ]
                  .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map((row) => (
                    <tr key={row.id} className="border-b border-line/70">
                      <td className="py-2.5 whitespace-nowrap">{formatDisplayDate(row.at)}</td>
                      <td className="py-2.5">
                        <Badge tone={row.kind === "Upad" ? "copper" : "ok"}>{row.kind}</Badge>
                      </td>
                      <td className="py-2.5">
                        <button className="font-medium text-copper hover:underline" onClick={() => downloadPdf(row.href, `${row.receiptNo}.pdf`)}>
                          {row.receiptNo}
                        </button>
                        <div className="text-xs text-stone">{row.extra}</div>
                      </td>
                      <td className="py-2.5 text-right font-semibold">{inr(row.amount)}</td>
                      <td className="py-2.5 text-stone">{row.by}</td>
                    </tr>
                  ))}
                {employee.advances.length === 0 && employee.salaryPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone">
                      No diary entries yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="text-lg font-semibold">Give upad</h3>
            <p className="mb-4 text-sm text-stone">Enter amount, then ask the employee to type their 4-digit PIN instead of signing the diary.</p>
            <div className="space-y-3">
              <Field label="Amount (₹)">
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Date">
                <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
              </Field>
              <Field label="Note">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </Field>
              <div className="rounded-2xl bg-cream p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-copper" />
                  Employee PIN confirmation
                </div>
                <PinPad value={pin} onChange={setPin} />
              </div>
              <Button className="w-full" disabled={busy || pin.length !== 4 || !amount} onClick={issueUpad}>
                Confirm and give money
              </Button>
              <button className="text-sm font-medium text-copper hover:underline" onClick={() => setShowForgot(true)}>
                Forgot PIN?
              </button>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold">Salary payout</h3>
            <p className="mb-4 text-sm text-stone">When they come for cash salary, deduct some or all remaining upad from this month.</p>
            <div className="space-y-3">
              <Field label="Deduct from this salary (₹)" hint={`Maximum this month: ${inr(Math.min(employee.outstanding, employee.monthlySalary))}`}>
                <Input inputMode="decimal" value={deduct} onChange={(e) => setDeduct(e.target.value)} />
              </Field>
              {preview ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-cream p-3">
                    <p className="text-xs uppercase tracking-wider text-stone">Cash to give</p>
                    <p className="font-semibold">{inr(preview.cashToEmployee)}</p>
                  </div>
                  <div className="rounded-xl bg-cream p-3">
                    <p className="text-xs uppercase tracking-wider text-stone">Upad after this</p>
                    <p className="font-semibold">{inr(preview.upadRemainingAfter)}</p>
                  </div>
                </div>
              ) : (
                <Banner kind="error">Deduction cannot be more than remaining upad or this month&apos;s salary.</Banner>
              )}
              <Field label="Note">
                <Input value={salaryNote} onChange={(e) => setSalaryNote(e.target.value)} placeholder="Optional" />
              </Field>
              <div className="rounded-2xl bg-cream p-4">
                <p className="mb-3 text-sm font-semibold">Employee PIN</p>
                <PinPad value={salaryPin} onChange={setSalaryPin} />
              </div>
              <Button variant="ink" className="w-full" disabled={busy || salaryPin.length !== 4 || !preview} onClick={paySalary}>
                Confirm salary payout
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {showForgot ? (
        <Card>
          <ForgotPin employeeId={employee.id} employeeName={employee.name} onDone={() => setShowForgot(false)} />
          <Button variant="ghost" className="mt-3" onClick={() => setShowForgot(false)}>
            Close
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/8 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
