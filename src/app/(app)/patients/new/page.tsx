"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;
const INTERVAL_OPTIONS = [
  { label: "Weekly", value: 7 },
  { label: "2 Weeks", value: 14 },
] as const;

export default function NewPatientPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [duration, setDuration] = useState(30);
  const [interval, setInterval] = useState(7);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          durationDays: duration,
          followupIntervalDays: interval,
          consentGiven: consent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add patient");
      }

      router.push("/patients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const isValid = name.trim() && phone.trim().length >= 10 && consent;

  return (
    <div className="app-page px-4 py-5 lg:max-w-3xl lg:px-8 lg:py-8">
      <Link
        href="/patients"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Add Patient
      </Link>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-5 lg:p-7">
        {/* Patient Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
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
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
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

        {/* Treatment Duration */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Treatment Duration (days)
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                  duration === d
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Follow-up Interval */}
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Follow-up Interval
          </label>
          <div className="flex gap-2">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInterval(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                  interval === opt.value
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
            Patient has given verbal consent for treatment monitoring via
            WhatsApp
          </span>
        </label>

        {error && <p className="text-sm text-risk-critical">{error}</p>}

        <button
          type="submit"
          disabled={loading || !isValid}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Patient"}
        </button>
      </form>
    </div>
  );
}
