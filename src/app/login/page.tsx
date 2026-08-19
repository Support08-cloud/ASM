"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/client";
import { Banner, Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-ink v360-ring text-white lg:flex lg:flex-col lg:justify-between p-12">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/50">Vision · Studio · Tech · Micro · Measure · Light</p>
        </div>
        <div className="max-w-md">
          <Image src="/brand/logo.png" alt="Vision 360" width={220} height={220} priority />
          <h1 className="mt-8 text-4xl font-semibold leading-tight">
            Advance salary, <span className="text-copper">without the diary.</span>
          </h1>
          <p className="mt-4 text-white/70">
            Shared register for every desk. Employee 4-digit PIN replaces the signature. Salary cut is always visible before cash is paid.
          </p>
        </div>
        <p className="text-sm text-white/45">Innovating Visions, Crafting Excellence</p>
      </section>
      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-md space-y-5">
          <div className="lg:hidden">
            <Image src="/brand/logo.png" alt="Vision 360" width={96} height={96} className="rounded-2xl bg-ink p-2" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-copper">Vision 360 ASM</p>
            <h2 className="mt-1 text-3xl font-semibold">Sign in</h2>
            <p className="mt-2 text-sm text-stone">Admin and reception use the same app on any office PC.</p>
          </div>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Button className="w-full" disabled={busy} type="submit">
            Continue
          </Button>
          <p className="text-xs text-stone">Default admin: admin / Vision360@admin · Change this after first login.</p>
        </form>
      </section>
    </div>
  );
}
