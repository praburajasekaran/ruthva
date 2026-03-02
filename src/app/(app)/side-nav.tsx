"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Settings, Users } from "lucide-react";
import { AppLogo } from "@/components/branding/app-logo";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home, primary: false },
  { href: "/patients", label: "Patients", icon: Users, primary: false },
  { href: "/patients/new", label: "Add Patient", icon: Plus, primary: true },
  { href: "/settings", label: "Settings", icon: Settings, primary: false },
] as const;

export function SideNav({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-surface-raised/70 lg:flex lg:flex-col">
      <div className="border-b border-border px-6 py-5">
        <AppLogo priority />
        <p className="mt-2 truncate text-sm font-medium text-text-secondary">
          {clinicName}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          const baseClasses =
            "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors";

          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${baseClasses} ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${baseClasses} ${
                isActive
                  ? "bg-white text-text-primary shadow-sm ring-1 ring-border"
                  : "text-text-secondary hover:bg-white hover:text-text-primary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
