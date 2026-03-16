"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Plus, Settings, Activity } from "lucide-react";
import { AppLogo } from "@/components/branding/app-logo";

const navItems = [
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/dashboard", label: "Continuity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function SideNav({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden w-56 shrink-0 lg:flex lg:flex-col"
      style={{
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
    >
      {/* Workspace header */}
      <div
        className="flex items-center gap-2.5 px-4 py-4"
        style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}
      >
        <AppLogo priority className="h-6 w-auto brightness-0 invert" />
        <span
          className="max-w-[120px] truncate text-sm font-semibold"
          style={{ color: "var(--color-sidebar-text-active)" }}
        >
          {clinicName}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && item.href !== "/settings" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: isActive ? "var(--color-sidebar-active)" : "transparent",
                color: isActive
                  ? "var(--color-sidebar-text-active)"
                  : "var(--color-sidebar-text)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-sidebar-hover)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-sidebar-text-active)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-sidebar-text)";
                }
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Add patient — pinned at bottom */}
      <div className="px-2 pb-4">
        <Link
          href="/patients/new"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          style={{
            background: "var(--color-sidebar-active)",
            color: "var(--color-sidebar-text-active)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--color-sidebar-active)";
          }}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Add Patient</span>
        </Link>
      </div>
    </aside>
  );
}
