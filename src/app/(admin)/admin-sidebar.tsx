"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Users,
    PlusCircle,
    X,
    Menu,
    LayoutDashboard,
    LogOut,
} from "lucide-react";
import { AppLogo } from "@/components/branding/app-logo";

const navItems = [
    { href: "/admin", label: "Analytics", icon: BarChart3, exact: true },
    { href: "/admin/doctors", label: "Doctors", icon: Users, exact: false },
    {
        href: "/admin/onboard",
        label: "Onboard Clinic",
        icon: PlusCircle,
        exact: false,
    },
];

export function AdminSidebar({ hasClinic }: { hasClinic: boolean }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    const NavContent = () => (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-200">
                <AppLogo className="h-8 w-auto" priority />
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-neutral-900">Admin</span>
                    <span className="text-xs text-neutral-500">Ruthva Console</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                                    ? "bg-[#1a3a2a] text-white"
                                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                                }`}
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-4 pb-6 space-y-1 border-t border-neutral-200 pt-4">
                {hasClinic && (
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                    >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        Switch to Doctor View
                    </Link>
                )}
                <Link
                    href="/api/auth/signout"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Sign out
                </Link>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col bg-white border-r border-neutral-200">
                <NavContent />
            </aside>

            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-neutral-200">
                <div className="flex items-center gap-2">
                    <AppLogo className="h-7 w-auto" priority />
                    <span className="text-sm font-semibold text-neutral-900">Admin</span>
                </div>
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div
                        className="fixed inset-0 bg-black/40"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative flex w-72 flex-col bg-white shadow-xl">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <NavContent />
                    </div>
                </div>
            )}
        </>
    );
}
