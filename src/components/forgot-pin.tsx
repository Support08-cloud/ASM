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
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [showOnScreen, setShowOnScreen] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setShowOnScreen(false);
    try {
      const data = await api<{
        demoOtp?: string;
        message: string;
        delivered?: boolean;
        whatsappUrl?: string;
      }>("/api/pin/forgot", {
        method: "POST",
        body: JSON.stringify({ employeeId, phone }),
      });
      setStep("otp");
      setDelivered(Boolean(data.delivered));
      setWhatsappUrl(data.whatsappUrl || null);
      setDemoOtp(data.demoOtp || null);
      setOtp("");
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
      setDemoOtp(null);
      setWhatsappUrl(null);
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
          {employeeName} enters the registered mobile. Then send the OTP to their WhatsApp and they type it here.
        </p>
      </div>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}

      {delivered ? (
        <Banner kind="ok">OTP SMS sent. Ask {employeeName} to read it from their phone.</Banner>
      ) : null}

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
          Create OTP
        </Button>
      ) : (
        <>
          {whatsappUrl && !delivered ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1ebe5d]"
            >
              Send OTP on WhatsApp
            </a>
          ) : null}
          <p className="text-sm text-stone">
            WhatsApp opens with the OTP ready. Press Send, then ask {employeeName} to read the 6 digits from their phone and type them below.
          </p>
          <Field label="6-digit OTP from their phone">
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
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || otp.length !== 6 || pin.length !== 4 || pin !== pinConfirm} onClick={resetPin}>
              Save new PIN
            </Button>
            <Button variant="ghost" onClick={sendOtp} disabled={busy}>
              New OTP
            </Button>
          </div>
          {demoOtp && !showOnScreen ? (
            <button className="text-sm font-medium text-copper hover:underline" onClick={() => setShowOnScreen(true)}>
              WhatsApp not opening? Show OTP on this screen
            </button>
          ) : null}
          {showOnScreen && demoOtp ? (
            <div className="rounded-2xl border border-line bg-cream p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">OTP</p>
              <p className="mt-2 text-4xl font-semibold tracking-[0.28em]">{demoOtp}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
