"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { AppLogo } from "@/components/branding/app-logo";

const PRACTICE_TYPES = [
  { label: "Siddha", value: "siddha" },
  { label: "Ayurveda", value: "ayurveda" },
  { label: "Homeopathy", value: "homeopathy" },
] as const;

export default function OnboardingPage() {
  const submittingRef = useRef(false);
  const [doctorName, setDoctorName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [practiceType, setPracticeType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    doctorName.trim() &&
    registrationNumber.trim() &&
    clinicName.trim() &&
    clinicAddress.trim() &&
    whatsappNumber.trim().length >= 10 &&
    practiceType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current || !isValid) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/setup-clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorName: doctorName.trim(),
          registrationNumber: registrationNumber.trim(),
          clinicName: clinicName.trim(),
          clinicAddress: clinicAddress.trim(),
          whatsappNumber: whatsappNumber.trim(),
          practiceType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to set up clinic");
      }

      const { redirectUrl } = await res.json();
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mb-8">
          <div className="mb-6 flex items-center">
            <AppLogo className="h-10 w-auto" priority />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            Set up your clinic
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            This takes about 30 seconds
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-risk-at-risk/20 bg-risk-at-risk/5 px-4 py-3 text-sm text-risk-critical">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="doctorName"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Doctor Name
            </label>
            <input
              id="doctorName"
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. Priya Sharma"
              autoFocus
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="registrationNumber"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Registration Number
            </label>
            <input
              id="registrationNumber"
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. TN/BSMS/12345"
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="clinicName"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Clinic Name
            </label>
            <input
              id="clinicName"
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Sri Ayush Clinic"
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="clinicAddress"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Clinic Address
            </label>
            <textarea
              id="clinicAddress"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              placeholder="123, Gandhi Nagar, Chennai - 600020"
              rows={2}
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="whatsapp"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Clinic WhatsApp Number
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
              Practice Type
            </label>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPracticeType(pt.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    practiceType === pt.value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-border bg-surface text-text-secondary hover:border-brand-300"
                  }`}
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up your clinic...
                </>
              ) : (
                "Set up my clinic"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
