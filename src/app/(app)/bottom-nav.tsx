"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, PlusCircle, Settings } from "lucide-react";

const tabs = [
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/patients/new", label: "Add", icon: PlusCircle, primary: true },
  { href: "/dashboard", label: "Continuity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface pb-safe lg:hidden">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && tab.href !== "/settings" && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          if ("primary" in tab && tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-brand-600">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5"
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-text-muted"}`}
              />
              <span
                className={`text-xs font-semibold ${isActive ? "text-brand-600" : "text-text-muted"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
