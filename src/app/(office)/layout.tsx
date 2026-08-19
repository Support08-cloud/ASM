import { AppShell } from "@/components/app-shell";

export default function OfficeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
