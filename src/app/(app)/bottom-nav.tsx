"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, PlusCircle, Settings } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home, primary: false },
  { href: "/patients", label: "Patients", icon: Users, primary: false },
  { href: "/patients/new", label: "Add", icon: PlusCircle, primary: true },
  { href: "/settings", label: "Settings", icon: Settings, primary: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface pb-safe">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href ||
            (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
          const Icon = tab.icon;

          if (tab.primary) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-brand-600">
                  {tab.label}
                </span>
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
                className={`h-5 w-5 ${
                  isActive ? "text-brand-600" : "text-text-muted"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-brand-600" : "text-text-muted"
                }`}
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
