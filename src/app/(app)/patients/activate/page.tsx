"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;
const INTERVAL_OPTIONS = [
    { label: "Weekly", value: 7 },
    { label: "2 Weeks", value: 14 },
] as const;

const STARTED_OPTIONS = [
    { label: "Today", value: "today" },
    { label: "1 week ago", value: "7days" },
    { label: "2 weeks ago", value: "14days" },
    { label: "3+ weeks ago", value: "21days" },
    { label: "Custom date", value: "custom" },
] as const;

const VISIT_STATUS_OPTIONS = [
    { label: "Yes (last week)", value: "recent" },
    { label: "Not sure", value: "unsure" },
    { label: "No / overdue", value: "overdue" },
] as const;

export default function ActivatePatientsPage() {
    const router = useRouter();
    const submittingRef = useRef(false);

    // Form State
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [duration, setDuration] = useState(30);
    const [interval, setInterval] = useState(7);
    const [startedAgo, setStartedAgo] = useState<typeof STARTED_OPTIONS[number]["value"]>("today");
    const [customDate, setCustomDate] = useState("");
    const [visitStatus, setVisitStatus] = useState<typeof VISIT_STATUS_OPTIONS[number]["value"]>("recent");
    const [consent, setConsent] = useState(false);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ name: string; atRisk: boolean } | null>(null);
    const [count, setCount] = useState(0);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submittingRef.current) return;
        submittingRef.current = true;
        setLoading(true);
        setError("");
        setSuccess(null);

        try {
            const res = await fetch("/api/patients/activate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    durationDays: duration,
                    followupIntervalDays: interval,
                    treatmentStartedAgo: startedAgo,
                    customStartDate: startedAgo === "custom" ? customDate : undefined,
                    lastVisitStatus: visitStatus,
                    consentGiven: consent,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to activate patient");
            }

            const data = await res.json();

            setSuccess({ name: data.patient.name, atRisk: data.atRisk });
            setCount(prev => prev + 1);

            // Reset form for next patient (keep some defaults)
            setName("");
            setPhone("");
            setConsent(false);
            // Keep duration, interval, startedAgo, visitStatus as they might be similar for next patient

            submittingRef.current = false;
            setLoading(false);

            // Focus name input for next entry
            const nameInput = document.getElementById("name");
            nameInput?.focus();

        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            submittingRef.current = false;
            setLoading(false);
        }
    }

    const isValid = name.trim() && phone.trim().length >= 10 && consent && (startedAgo !== "custom" || customDate);

    return (
        <div className="app-page px-4 py-5 lg:max-w-3xl lg:px-8 lg:py-8">
            <Link
                href="/patients"
                className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Patients
            </Link>

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Activate Patients</h1>
                    <p className="text-sm text-text-muted">Onboard patients already mid-treatment</p>
                </div>
                {count > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 border border-brand-100">
                        <Sparkles className="h-3 w-3" />
                        {count} activated
                    </div>
                )}
            </div>

            {success && (
                <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 animate-in fade-in slide-in-from-top-2 ${success.atRisk
                        ? "border-risk-at-risk/20 bg-risk-at-risk/5 text-risk-at-risk"
                        : "border-risk-stable/20 bg-risk-stable/5 text-risk-stable"
                    }`}>
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">
                            {success.name} activated successfully
                        </p>
                        {success.atRisk && (
                            <p className="mt-0.5 text-xs opacity-90">
                                ⚠️ This patient is overdue and has been flagged for attention.
                            </p>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-5 lg:p-7">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Patient Name */}
                    <div className="md:col-span-1">
                        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-primary">
                            Patient Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ravi Kumar"
                            required
                            autoFocus
                            className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    {/* Phone Number */}
                    <div className="md:col-span-1">
                        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-primary">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            required
                            className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                </div>

                {/* Treatment Start */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-text-primary">
                        When did treatment start?
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                        {STARTED_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setStartedAgo(opt.value)}
                                className={`flex-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${startedAgo === opt.value
                                        ? "border-brand-600 bg-brand-50 text-brand-700"
                                        : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {startedAgo === "custom" && (
                        <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="mt-3 block w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                        />
                    )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Duration */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-text-primary">
                            Duration (days)
                        </label>
                        <div className="flex gap-2">
                            {DURATION_OPTIONS.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDuration(d)}
                                    className={`flex-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${duration === d
                                            ? "border-brand-600 bg-brand-50 text-brand-700"
                                            : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interval */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-text-primary">
                            Follow-up
                        </label>
                        <div className="flex gap-2">
                            {INTERVAL_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setInterval(opt.value)}
                                    className={`flex-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${interval === opt.value
                                            ? "border-brand-600 bg-brand-50 text-brand-700"
                                            : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Visit Status (The Clever Trick) */}
                <div className="rounded-xl border border-brand-100 bg-brand-50/30 p-4">
                    <label className="mb-3 block text-sm font-semibold text-brand-900">
                        Has this patient visited recently?
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {VISIT_STATUS_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setVisitStatus(opt.value)}
                                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${visitStatus === opt.value
                                        ? "border-brand-600 bg-white text-brand-700 shadow-sm"
                                        : "border-transparent text-text-secondary hover:bg-white/50"
                                    }`}
                            >
                                {opt.value === "overdue" && <AlertCircle className="h-4 w-4" />}
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-brand-700/70">
                        Patients marked as <b>No / overdue</b> will immediately appear in your "Needs Attention" list.
                    </p>
                </div>

                {/* Consent Checkbox */}
                <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised p-3">
                    <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-5 w-5 rounded border-border text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm leading-relaxed text-text-secondary">
                        Patient has given verbal consent for treatment monitoring via WhatsApp
                    </span>
                </label>

                {error && (
                    <div className="flex items-center gap-2 rounded-lg bg-risk-critical/10 p-3 text-sm text-risk-critical">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || !isValid}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-brand-600 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {loading ? "Activating..." : (
                        <>
                            Activate Patient
                            <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                <Link href="/patients" className="text-sm font-medium text-text-muted hover:text-brand-600">
                    Done adding patients? View list
                </Link>
            </div>
        </div>
    );
}
