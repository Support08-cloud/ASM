"use client";

import { Delete } from "lucide-react";
import { cn } from "./ui";

export function PinPad({
  value,
  onChange,
  length = 4,
  masked = true,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  masked?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  function press(key: string) {
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= length) return;
    if (!/^\d$/.test(key)) return;
    onChange(value + key);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2.5">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-14 w-12 rounded-xl border-2 text-center text-2xl font-semibold leading-[3.25rem]",
              value[i] ? "border-copper bg-cream text-ink" : "border-line bg-white text-stone",
            )}
          >
            {value[i] ? (masked ? "•" : value[i]) : ""}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className="h-14 rounded-xl border border-line bg-white text-xl font-semibold text-ink transition hover:border-copper hover:bg-cream active:bg-orange-50"
            >
              {key === "del" ? <Delete className="mx-auto h-5 w-5" /> : key}
            </button>
          ),
        )}
      </div>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        className="sr-only"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
      />
    </div>
  );
}
