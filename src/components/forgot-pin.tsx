"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Banner, Button, Field, Input } from "./ui";
import { PinPad } from "./pin-pad";

export function ForgotPin({
  employeeId,
  employeeName,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  onDone?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ demoOtp?: string; message: string }>("/api/pin/forgot", {
        method: "POST",
        body: JSON.stringify({ employeeId, phone }),
      });
      setStep("otp");
      setDemoOtp(data.demoOtp || null);
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP");
    } finally {
      setBusy(false);
    }
  }

  async function resetPin() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/pin/reset", {
        method: "POST",
        body: JSON.stringify({ employeeId, phone, otp, pin, pinConfirm }),
      });
      setMessage("PIN changed. Use the new PIN from now on.");
      setStep("phone");
      setOtp("");
      setPin("");
      setPinConfirm("");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change PIN");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Forgot PIN</h3>
        <p className="text-sm text-stone">
          {employeeName} must enter the registered mobile number. An OTP confirms it is really them before a new 4-digit PIN can be set.
        </p>
      </div>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind={demoOtp ? "warn" : "ok"}>{message}{demoOtp ? ` Demo OTP: ${demoOtp}` : ""}</Banner> : null}
      <Field label="Registered mobile">
        <Input
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
      </Field>
      {step === "phone" ? (
        <Button disabled={busy || phone.length !== 10} onClick={sendOtp}>
          Send OTP
        </Button>
      ) : (
        <>
          <Field label="6-digit OTP">
            <Input
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <Field label="New 4-digit PIN">
            <PinPad value={pin} onChange={setPin} />
          </Field>
          <Field label="Confirm new PIN">
            <PinPad value={pinConfirm} onChange={setPinConfirm} />
          </Field>
          <div className="flex gap-2">
            <Button disabled={busy || otp.length !== 6 || pin.length !== 4} onClick={resetPin}>
              Save new PIN
            </Button>
            <Button variant="ghost" onClick={sendOtp} disabled={busy}>
              Resend OTP
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
