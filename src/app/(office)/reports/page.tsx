"use client";

import { useEffect, useState } from "react";
import { api, downloadPdf, inr } from "@/lib/client";
import { Banner, Button, Card, Field, Input, Select, Stat } from "@/components/ui";

type Report = {
  range: { label: string };
  totals: { count: number; amount: number; remaining: number; deducted: number; netPaid: number };
  buckets: Array<{ key: string; label: string; count: number; amount: number; remaining: number }>;
  rows: Array<{
    id: string;
    date: string;
    receiptNo: string;
    employeeCode: string;
    employeeName: string;
    amount: number;
    remaining: number;
    issuedBy: string;
    note?: string | null;
  }>;
};

const PRESETS = [
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "last_30", label: "Last 30 days" },
  { id: "custom", label: "Custom dates" },
];

export default function ReportsPage() {
  const [preset, setPreset] = useState("this_month");
  const [bucket, setBucket] = useState("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  function query() {
    const params = new URLSearchParams({ preset, bucket });
    if (preset === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    return params.toString();
  }

  async function load() {
    setError(null);
    try {
      setReport(await api<Report>(`/api/reports?${query()}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load report");
    }
  }

  useEffect(() => {
    if (preset !== "custom") load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, bucket]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Reports</h2>
          <p className="text-sm text-stone">Week, month, last 30 days, or any From – To range. Download PDF for sir.</p>
        </div>
        <Button
          variant="ink"
          onClick={() => downloadPdf(`/api/reports/pdf?${query()}`, `vision360-upad-${preset}.pdf`)}
        >
          Download PDF
        </Button>
      </div>
      <Card className="grid gap-3 md:grid-cols-5">
        <Field label="Period">
          <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Group by">
          <Select value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </Select>
        </Field>
        {preset === "custom" ? (
          <>
            <Field label="From">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Button className="self-end" onClick={load}>
              Show
            </Button>
          </>
        ) : (
          <div className="self-end text-sm text-stone md:col-span-3">{report?.range.label}</div>
        )}
      </Card>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Entries" value={String(report.totals.count)} />
            <Stat label="Upad given" value={inr(report.totals.amount)} />
            <Stat label="Still open from these" value={inr(report.totals.remaining)} />
            <Stat label="Recovered in salary" value={inr(report.totals.deducted)} />
          </div>
          <Card>
            <h3 className="mb-3 font-semibold">Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-stone">
                    <th className="pb-2">Period</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Still remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {report.buckets.map((row) => (
                    <tr key={row.key} className="border-b border-line/70">
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right">{inr(row.amount)}</td>
                      <td className="py-2 text-right">{inr(row.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink text-white">
                <tr className="text-left text-[11px] uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Receipt</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="px-4 py-2.5">{row.date}</td>
                    <td className="px-4 py-2.5">{row.receiptNo}</td>
                    <td className="px-4 py-2.5">
                      {row.employeeName}
                      <div className="text-xs text-stone">{row.employeeCode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold">{inr(row.amount)}</td>
                    <td className="px-4 py-2.5 text-right">{inr(row.remaining)}</td>
                    <td className="px-4 py-2.5">{row.issuedBy}</td>
                  </tr>
                ))}
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone">
                      No upad in this period.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}
    </div>
  );
}
