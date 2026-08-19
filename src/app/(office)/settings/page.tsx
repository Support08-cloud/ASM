"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Banner, Button, Card, Field, Input, Select } from "@/components/ui";
import { formatDisplayDateTime } from "@/lib/dates";

type Settings = {
  companyName: string;
  companyTagline: string;
  demoOtp: boolean;
  maxAdvancePercent: number;
  pinMaxAttempts: number;
  pinLockMinutes: number;
  otpExpiryMinutes: number;
  msg91AuthKey: string;
  msg91TemplateId: string;
  msg91SenderId: string;
  hasMsg91: boolean;
};

type Log = {
  id: string;
  action: string;
  createdAt: string;
  details: string | null;
  actor: { name: string } | null;
  employee: { name: string; code: string } | null;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [key, setKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ settings: Settings }>("/api/settings");
    setSettings(data.settings);
    try {
      const audit = await api<{ logs: Log[] }>("/api/audit");
      setLogs(audit.logs);
    } catch {
      setLogs([]);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Could not load settings"));
  }, []);

  async function save() {
    if (!settings) return;
    setError(null);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...settings,
          msg91AuthKey: key.includes("•") ? undefined : key,
        }),
      });
      setNotice("Settings saved");
      setKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  if (!settings) return <p className="text-stone">{error || "Loading settings…"}</p>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-stone">Forgot PIN sends OTP on WhatsApp. No MSG91 account is needed. MSG91 is optional later for automatic SMS.</p>
      </div>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {notice ? <Banner kind="ok">{notice}</Banner> : null}
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Company name">
          <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <Input value={settings.companyTagline} onChange={(e) => setSettings({ ...settings, companyTagline: e.target.value })} />
        </Field>
        <Field label="Warn if upad exceeds % of salary">
          <Input type="number" value={settings.maxAdvancePercent} onChange={(e) => setSettings({ ...settings, maxAdvancePercent: Number(e.target.value) })} />
        </Field>
        <Field label="Wrong PIN tries before lock">
          <Input type="number" value={settings.pinMaxAttempts} onChange={(e) => setSettings({ ...settings, pinMaxAttempts: Number(e.target.value) })} />
        </Field>
        <Field label="PIN lock minutes">
          <Input type="number" value={settings.pinLockMinutes} onChange={(e) => setSettings({ ...settings, pinLockMinutes: Number(e.target.value) })} />
        </Field>
        <Field label="OTP expiry minutes">
          <Input type="number" value={settings.otpExpiryMinutes} onChange={(e) => setSettings({ ...settings, otpExpiryMinutes: Number(e.target.value) })} />
        </Field>
        <Field label="Allow on-screen OTP backup">
          <Select value={settings.demoOtp ? "yes" : "no"} onChange={(e) => setSettings({ ...settings, demoOtp: e.target.value === "yes" })}>
            <option value="yes">Yes — if WhatsApp cannot open</option>
            <option value="no">No — WhatsApp / SMS only</option>
          </Select>
        </Field>
        <Field label="Optional MSG91 sender ID">
          <Input value={settings.msg91SenderId} onChange={(e) => setSettings({ ...settings, msg91SenderId: e.target.value })} />
        </Field>
        <Field label="Optional MSG91 template ID">
          <Input value={settings.msg91TemplateId} onChange={(e) => setSettings({ ...settings, msg91TemplateId: e.target.value })} />
        </Field>
        <Field label="Optional MSG91 auth key" hint="Leave empty. WhatsApp OTP works without this.">
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={settings.hasMsg91 ? "••••••••" : ""} />
        </Field>
        <div className="md:col-span-2">
          <Button onClick={save}>Save settings</Button>
        </div>
      </Card>
      <Card>
        <h3 className="mb-3 font-semibold">Recent activity</h3>
        <div className="divide-y divide-line text-sm">
          {logs.map((log) => (
            <div key={log.id} className="py-2.5">
              <p className="font-medium">
                {log.action.replaceAll("_", " ")}
                {log.employee ? ` · ${log.employee.name}` : ""}
              </p>
              <p className="text-xs text-stone">
                {formatDisplayDateTime(log.createdAt)} · {log.actor?.name || "System"}
              </p>
            </div>
          ))}
          {logs.length === 0 ? <p className="py-4 text-stone">No activity yet, or you are not admin.</p> : null}
        </div>
      </Card>
    </div>
  );
}
