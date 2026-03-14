"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

const DURATION_OPTIONS = [15, 30, 45, 60] as const;
const INTERVAL_OPTIONS = [
  { label: "Weekly", value: 7 },
  { label: "2 Weeks", value: 14 },
] as const;

type EditPatientFormProps = {
  patientId: string;
  initialName: string;
  initialPhone: string;
  initialDuration: number;
  initialInterval: number;
  initialConsent: boolean;
};

export function EditPatientForm({
  patientId,
  initialName,
  initialPhone,
  initialDuration,
  initialInterval,
  initialConsent,
}: EditPatientFormProps) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [duration, setDuration] = useState(initialDuration);
  const [interval, setInterval] = useState(initialInterval);
  const [consent, setConsent] = useState(initialConsent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
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
        throw new Error(data.error || "Failed to update patient");
      }

      router.push(`/patients/${patientId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const isValid = name.trim() && phone.trim().length >= 10 && consent;

  return (
    <div className="app-page px-4 py-5 lg:max-w-3xl lg:px-8 lg:py-8">
      <Link
        href={`/patients/${patientId}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patient
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Edit Patient</h1>
        <p className="text-sm text-text-muted">
          Update contact details and active follow-up settings.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border bg-surface p-5 lg:p-7"
      >
        <div className="grid gap-6 md:grid-cols-2">
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
              required
              autoFocus
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

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
              required
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Treatment Duration (days)
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDuration(option)}
                  className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                    duration === option
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Follow-up Interval
            </label>
            <div className="flex gap-2">
              {INTERVAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setInterval(option.value)}
                  className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${
                    interval === option.value
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-border bg-surface text-text-secondary hover:bg-surface-raised"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

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

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-risk-critical/10 p-3 text-sm text-risk-critical">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/patients/${patientId}`}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface-raised"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !isValid}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
