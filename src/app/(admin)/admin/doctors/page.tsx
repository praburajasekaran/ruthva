"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Search,
    ChevronRight,
    UserCheck,
    UserX,
    Building2,
    Loader2,
} from "lucide-react";

type Doctor = {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    isActive: boolean;
    deactivatedAt: string | null;
    clinic: {
        id: string;
        name: string;
        doctorName: string;
        whatsappNumber: string;
        patientCount: number;
        activeJourneys: number;
        completedJourneys: number;
        droppedJourneys: number;
    } | null;
};

export default function DoctorsClient() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actioning, setActioning] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/admin/doctors")
            .then((r) => r.json())
            .then((data) => {
                setDoctors(data.doctors ?? []);
                setLoading(false);
            });
    }, []);

    const filtered = doctors.filter((d) => {
        const q = search.toLowerCase();
        return (
            (d.email ?? "").toLowerCase().includes(q) ||
            (d.name ?? "").toLowerCase().includes(q) ||
            (d.clinic?.name ?? "").toLowerCase().includes(q)
        );
    });

    async function handleToggle(doctor: Doctor) {
        const action = doctor.isActive ? "deactivate" : "reactivate";
        setActioning(doctor.id);
        setConfirmId(null);
        try {
            await fetch(`/api/admin/doctors/${doctor.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            setDoctors((prev) =>
                prev.map((d) =>
                    d.id === doctor.id
                        ? {
                            ...d,
                            isActive: action === "reactivate",
                            deactivatedAt:
                                action === "deactivate" ? new Date().toISOString() : null,
                        }
                        : d
                )
            );
        } finally {
            setActioning(null);
        }
    }

    return (
        <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:pt-8 pt-20">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-900">Doctors</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {doctors.length} registered
                    </p>
                </div>
                <Link
                    href="/admin/onboard"
                    className="flex items-center gap-2 px-4 py-2 bg-[#1a3a2a] text-white text-sm font-medium rounded-lg hover:bg-[#0f2a1d] transition-colors"
                >
                    + Onboard New Clinic
                </Link>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, or clinic..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                />
            </div>

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse"
                        >
                            <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2" />
                            <div className="h-3 bg-neutral-100 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-sm">
                    {search ? "No doctors match your search" : "No doctors yet"}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((doctor) => (
                        <div
                            key={doctor.id}
                            className="bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-colors"
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-neutral-900 truncate">
                                            {doctor.clinic?.doctorName ?? doctor.name ?? doctor.email}
                                        </p>
                                        <span
                                            className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${doctor.isActive
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {doctor.isActive ? "Active" : "Deactivated"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                        {doctor.email}
                                    </p>
                                    {doctor.clinic ? (
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />
                                                {doctor.clinic.name}
                                            </span>
                                            <span>{doctor.clinic.patientCount} patients</span>
                                            <span>{doctor.clinic.activeJourneys} active</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-600 mt-1">
                                            No clinic — incomplete onboarding
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Deactivate / Reactivate */}
                                    {confirmId === doctor.id ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-neutral-600">
                                                {doctor.isActive ? "Deactivate?" : "Reactivate?"}
                                            </span>
                                            <button
                                                onClick={() => handleToggle(doctor)}
                                                className={`px-2.5 py-1 rounded text-xs font-medium ${doctor.isActive
                                                        ? "bg-red-600 text-white hover:bg-red-700"
                                                        : "bg-green-600 text-white hover:bg-green-700"
                                                    } transition-colors`}
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => setConfirmId(null)}
                                                className="px-2.5 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : actioning === doctor.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                                    ) : (
                                        <button
                                            onClick={() => setConfirmId(doctor.id)}
                                            className={`p-1.5 rounded-lg transition-colors ${doctor.isActive
                                                    ? "text-neutral-400 hover:bg-red-50 hover:text-red-600"
                                                    : "text-neutral-400 hover:bg-green-50 hover:text-green-600"
                                                }`}
                                            title={doctor.isActive ? "Deactivate" : "Reactivate"}
                                        >
                                            {doctor.isActive ? (
                                                <UserX className="h-4 w-4" />
                                            ) : (
                                                <UserCheck className="h-4 w-4" />
                                            )}
                                        </button>
                                    )}

                                    <Link
                                        href={`/admin/doctors/${doctor.id}`}
                                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
