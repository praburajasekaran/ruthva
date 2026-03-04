"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    UserCheck,
    UserX,
    Pencil,
    Check,
    X,
    Loader2,
    Clock,
} from "lucide-react";

type DoctorDetail = {
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
        email: string | null;
        patientCount: number;
        journeyStats: {
            active: number;
            completed: number;
            dropped: number;
            riskLevels: {
                stable: number;
                watch: number;
                at_risk: number;
                critical: number;
            };
        };
    } | null;
    recentEvents: {
        id: string;
        eventType: string;
        eventDate: string;
        createdAt: string;
        patientName: string;
    }[];
};

function formatEventType(type: string) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventColor(type: string) {
    if (type.includes("failed")) return "text-red-600 bg-red-50";
    if (type.includes("missed")) return "text-orange-600 bg-orange-50";
    if (type.includes("critical")) return "text-red-600 bg-red-50";
    if (type.includes("risk")) return "text-amber-600 bg-amber-50";
    if (type.includes("returned") || type.includes("confirmed"))
        return "text-green-700 bg-green-50";
    return "text-neutral-600 bg-neutral-100";
}

export function DoctorDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState(false);
    const [confirm, setConfirm] = useState(false);

    // Edit state
    const [editing, setEditing] = useState(false);
    const [clinicName, setClinicName] = useState("");
    const [doctorName, setDoctorName] = useState("");
    const [clinicEmail, setClinicEmail] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`/api/admin/doctors/${id}`)
            .then((r) => r.json())
            .then((data) => {
                setDoctor(data);
                setClinicName(data.clinic?.name ?? "");
                setDoctorName(data.clinic?.doctorName ?? "");
                setClinicEmail(data.clinic?.email ?? "");
                setLoading(false);
            });
    }, [id]);

    async function handleToggle() {
        if (!doctor) return;
        const action = doctor.isActive ? "deactivate" : "reactivate";
        setActioning(true);
        setConfirm(false);
        await fetch(`/api/admin/doctors/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        setDoctor((d) =>
            d
                ? {
                    ...d,
                    isActive: action === "reactivate",
                    deactivatedAt:
                        action === "deactivate" ? new Date().toISOString() : null,
                }
                : null
        );
        setActioning(false);
    }

    async function handleSaveEdit() {
        if (!doctor) return;
        setSaving(true);
        await fetch(`/api/admin/doctors/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clinicName,
                doctorName,
                email: clinicEmail || null,
            }),
        });
        setDoctor((d) =>
            d && d.clinic
                ? {
                    ...d,
                    clinic: {
                        ...d.clinic,
                        name: clinicName,
                        doctorName,
                        email: clinicEmail || null,
                    },
                }
                : d
        );
        setSaving(false);
        setEditing(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="px-4 py-8 text-center text-neutral-400">
                Doctor not found
            </div>
        );
    }

    return (
        <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:pt-8 pt-20 max-w-3xl">
            {/* Back + header */}
            <div>
                <Link
                    href="/admin/doctors"
                    className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All Doctors
                </Link>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-xl font-semibold text-neutral-900">
                            {doctor.clinic?.doctorName ?? doctor.name ?? doctor.email}
                        </h1>
                        <p className="text-sm text-neutral-500 mt-0.5">{doctor.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${doctor.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {doctor.isActive ? "Active" : "Deactivated"}
                            </span>
                            <span className="text-xs text-neutral-400">
                                Joined{" "}
                                {new Date(doctor.createdAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    timeZone: "Asia/Kolkata",
                                })}
                            </span>
                        </div>
                    </div>

                    {confirm ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">
                                {doctor.isActive
                                    ? "Deactivate this doctor?"
                                    : "Reactivate this doctor?"}
                            </span>
                            <button
                                onClick={handleToggle}
                                disabled={actioning}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${doctor.isActive
                                    ? "bg-red-600 text-white hover:bg-red-700"
                                    : "bg-green-600 text-white hover:bg-green-700"
                                    } transition-colors disabled:opacity-50`}
                            >
                                {actioning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Confirm
                            </button>
                            <button
                                onClick={() => setConfirm(false)}
                                className="px-3 py-1.5 rounded-lg text-sm bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirm(true)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${doctor.isActive
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-700 hover:bg-green-50"
                                }`}
                        >
                            {doctor.isActive ? (
                                <UserX className="h-4 w-4" />
                            ) : (
                                <UserCheck className="h-4 w-4" />
                            )}
                            {doctor.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                    )}
                </div>
            </div>

            {/* Clinic Details */}
            {doctor.clinic && (
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-neutral-800">
                            Clinic Details
                        </h2>
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
                                >
                                    {saving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Save
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <EditField
                                label="Clinic Name"
                                value={clinicName}
                                onChange={setClinicName}
                            />
                            <EditField
                                label="Doctor Name"
                                value={doctorName}
                                onChange={setDoctorName}
                            />
                            <EditField
                                label="Clinic Email"
                                value={clinicEmail}
                                onChange={setClinicEmail}
                                type="email"
                            />
                        </div>
                    ) : (
                        <dl className="space-y-2">
                            <Row label="Clinic Name" value={doctor.clinic.name} />
                            <Row label="Doctor Name" value={doctor.clinic.doctorName} />
                            <Row
                                label="WhatsApp"
                                value={doctor.clinic.whatsappNumber}
                            />
                            <Row
                                label="Email"
                                value={doctor.clinic.email ?? "—"}
                            />
                        </dl>
                    )}
                </div>
            )}

            {/* Stats */}
            {doctor.clinic && (
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                    <h2 className="text-sm font-semibold text-neutral-800 mb-4">
                        Journey Stats
                    </h2>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <MiniStat
                            label="Active"
                            value={doctor.clinic.journeyStats.active}
                            color="text-green-700"
                        />
                        <MiniStat
                            label="Completed"
                            value={doctor.clinic.journeyStats.completed}
                            color="text-blue-700"
                        />
                        <MiniStat
                            label="Dropped"
                            value={doctor.clinic.journeyStats.dropped}
                            color="text-red-600"
                        />
                    </div>
                    <div className="text-xs text-neutral-500 mb-2">Risk levels (active)</div>
                    <div className="grid grid-cols-4 gap-2">
                        {(
                            [
                                ["stable", "green"],
                                ["watch", "amber"],
                                ["at_risk", "orange"],
                                ["critical", "red"],
                            ] as const
                        ).map(([level, color]) => (
                            <div key={level} className="text-center">
                                <p
                                    className={`text-xl font-semibold text-${color}-600 tabular-nums`}
                                >
                                    {
                                        doctor.clinic!.journeyStats.riskLevels[
                                        level as keyof typeof doctor.clinic.journeyStats.riskLevels
                                        ]
                                    }
                                </p>
                                <p className="text-xs text-neutral-400 capitalize">
                                    {level.replace("_", " ")}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Activity Timeline */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
                <h2 className="text-sm font-semibold text-neutral-800 mb-4">
                    Recent Activity
                </h2>
                {doctor.recentEvents.length === 0 ? (
                    <p className="text-sm text-neutral-400">No events yet</p>
                ) : (
                    <div className="space-y-2">
                        {doctor.recentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="flex items-start gap-3"
                            >
                                <div className="mt-0.5">
                                    <Clock className="h-3.5 w-3.5 text-neutral-300" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${eventColor(
                                                event.eventType
                                            )}`}
                                        >
                                            {formatEventType(event.eventType)}
                                        </span>
                                        <span className="text-xs text-neutral-500 truncate">
                                            {event.patientName}
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        {new Date(event.createdAt).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            timeZone: "Asia/Kolkata",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function EditField({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
            />
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="text-xs text-neutral-400 w-24 shrink-0 pt-0.5">
                {label}
            </span>
            <span className="text-sm text-neutral-800">{value}</span>
        </div>
    );
}

function MiniStat({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="text-center p-3 rounded-lg bg-neutral-50">
            <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-neutral-400">{label}</p>
        </div>
    );
}
