"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Wallet,
  FileBarChart,
} from "lucide-react";
import { api, type SessionUser } from "@/lib/client";
import { Button, cn } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/issue", label: "Issue upad", icon: Wallet },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/staff", label: "Staff logins", icon: ClipboardList, admin: true },
  { href: "/settings", label: "Settings", icon: Settings, admin: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api<{ user: SessionUser }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="flex min-h-screen flex-col bg-ink text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Image src="/brand/logo.png" alt="Vision 360" width={52} height={52} className="rounded-lg" />
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Vision 360°</p>
            <p className="text-sm font-semibold text-copper">Advance Salary</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.filter((item) => !item.admin || user?.role === "ADMIN").map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-copper text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4">
          <p className="text-sm font-semibold">{user?.name || "…"}</p>
          <p className="text-xs uppercase tracking-wider text-white/50">{user?.role === "ADMIN" ? "Admin" : "Reception / Staff"}</p>
          <Button variant="ghost" className="mt-3 w-full border-white/15 bg-transparent text-white hover:bg-white/10" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/90 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-copper">Innovating Visions, Crafting Excellence</p>
            <h1 className="text-lg font-semibold">Digital upad register</h1>
          </div>
          <Link href="/employees/new" className="hidden sm:block">
            <Button>Add employee</Button>
          </Link>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
