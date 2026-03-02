"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, AlertCircle, TrendingUp } from "lucide-react";

type Step = "identity" | "preview";

export default function OnboardingPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<Step>("identity");
  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateClinic() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clinicName.trim(),
          doctorName: doctorName.trim(),
          whatsappNumber: whatsappNumber.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create clinic");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (step === "identity") {
    const isValid =
      clinicName.trim() &&
      doctorName.trim() &&
      whatsappNumber.trim().length >= 10;

    return (
      <div className="flex min-h-dvh flex-col px-6 py-8">
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            Set up your clinic
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            This takes about 30 seconds
          </p>
        </div>

        <div className="space-y-4">
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
              required
              autoFocus
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

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
              required
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
              required
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setStep("preview")}
            disabled={!isValid}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Preview — show what the dashboard will look like
  return (
    <div className="flex min-h-dvh flex-col px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">
          Here&apos;s what you&apos;ll see
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your dashboard will look like this once patients are added
        </p>
      </div>

      {/* Demo Dashboard */}
      <div className="mb-6 rounded-xl border border-border bg-surface-raised p-4">
        <div className="mb-4 rounded-lg border border-border bg-surface p-3">
          <p className="text-2xl font-semibold tabular-nums text-risk-at-risk">
            3
          </p>
          <p className="text-xs text-text-secondary">Patients at risk</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-surface p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-risk-critical/10">
              <AlertCircle className="h-4 w-4 text-risk-critical" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-text-primary">
                Sample Patient
              </p>
              <p className="text-[10px] text-text-muted">
                Follow-up overdue by 5 days
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-surface p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-risk-watch/10">
              <TrendingUp className="h-4 w-4 text-risk-watch" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-text-primary">
                Another Patient
              </p>
              <p className="text-[10px] text-text-muted">
                1 day past expected visit
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-6 text-center text-xs text-text-muted">
        Ruthva automatically detects patients dropping off treatment and helps
        bring them back via WhatsApp
      </p>

      {error && <p className="mb-4 text-sm text-risk-critical">{error}</p>}

      <button
        onClick={handleCreateClinic}
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creating clinic..." : "Start using Ruthva"}
      </button>

      <button
        onClick={() => setStep("identity")}
        className="mt-3 w-full py-2 text-sm text-text-secondary"
      >
        Go back
      </button>
    </div>
  );
}
