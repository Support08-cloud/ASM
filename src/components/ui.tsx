"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return clsx(parts);
}

export function Button({
  variant = "copper",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "copper" | "ink" | "ghost" | "danger" }) {
  const styles = {
    copper: "bg-copper text-white hover:bg-copper-hot shadow-sm",
    ink: "bg-ink text-white hover:bg-ink-soft",
    ghost: "bg-white text-ink border border-line hover:bg-cream",
    danger: "bg-danger text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-stone">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/15";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, props.className)} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-[88px] resize-y", props.className)} {...props} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-2xl border border-line bg-white p-5 shadow-[0_10px_30px_rgba(17,17,17,0.04)]", className)}>{children}</section>;
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-sm text-stone">{hint}</p> : null}
    </Card>
  );
}

export function Banner({
  kind = "info",
  children,
}: {
  kind?: "info" | "ok" | "warn" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-cream text-ink border-line",
    ok: "bg-emerald-50 text-ok border-emerald-200",
    warn: "bg-orange-50 text-copper-deep border-orange-200",
    error: "bg-red-50 text-danger border-red-200",
  }[kind];
  return <div className={cn("rounded-xl border px-3.5 py-3 text-sm", styles)}>{children}</div>;
}

export function Badge({ children, tone = "stone" }: { children: ReactNode; tone?: "stone" | "copper" | "ok" | "danger" }) {
  const styles = {
    stone: "bg-cream text-stone",
    copper: "bg-orange-50 text-copper-deep",
    ok: "bg-emerald-50 text-ok",
    danger: "bg-red-50 text-danger",
  }[tone];
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles)}>{children}</span>;
}
