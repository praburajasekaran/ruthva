"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  MessageCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const DURATION_OPTIONS = [
  { label: "15 days", value: 15 },
  { label: "30 days", value: 30 },
  { label: "45 days", value: 45 },
  { label: "60 days", value: 60 },
];

const INTERVAL_OPTIONS = [
  { label: "Weekly", value: 7 },
  { label: "Every 2 weeks", value: 14 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [step, setStep] = useState<Step>(1);

  // Clinic fields
  const [clinicName, setClinicName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Patient fields
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [followupIntervalDays, setFollowupIntervalDays] = useState(7);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Simulation state for step 5
  const [simPhase, setSimPhase] = useState<
    "idle" | "day7" | "day10" | "recovery" | "done"
  >("idle");

  async function handleComplete() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic: {
            name: clinicName.trim(),
            doctorName: doctorName.trim(),
            whatsappNumber: whatsappNumber.trim(),
          },
          patient: {
            name: patientName.trim(),
            phone: patientPhone.trim(),
            durationDays,
            followupIntervalDays,
            consentGiven: true,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete setup");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      submittingRef.current = false;
      setLoading(false);
    }
  }

  function runSimulation() {
    setSimPhase("day7");
    setTimeout(() => setSimPhase("day10"), 1200);
    setTimeout(() => setSimPhase("recovery"), 2400);
    setTimeout(() => setSimPhase("done"), 3600);
  }

  const displayName = patientName.trim() || "Patient";
  const displayClinic = clinicName.trim() || "Your Clinic";

  const progress = (step / 5) * 100;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Progress bar */}
      <div className="h-1 w-full bg-neutral-100">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col px-6 py-8">
        {/* Step 1: Identity */}
        {step === 1 && (
          <>
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
              <InputField
                id="clinicName"
                label="Clinic Name"
                value={clinicName}
                onChange={setClinicName}
                placeholder="Sri Ayush Clinic"
                autoFocus
              />
              <InputField
                id="doctorName"
                label="Doctor Name"
                value={doctorName}
                onChange={setDoctorName}
                placeholder="Dr. Priya Sharma"
              />
              <InputField
                id="whatsapp"
                label="Clinic WhatsApp Number"
                type="tel"
                inputMode="tel"
                value={whatsappNumber}
                onChange={setWhatsappNumber}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="mt-8">
              <NextButton
                onClick={() => setStep(2)}
                disabled={
                  !clinicName.trim() ||
                  !doctorName.trim() ||
                  whatsappNumber.trim().length < 10
                }
              />
            </div>
          </>
        )}

        {/* Step 2: Promise Preview */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-text-primary">
                Here&apos;s what you&apos;ll see
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Your dashboard will look like this once patients are added
              </p>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-surface-raised p-4">
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-2xl font-semibold tabular-nums text-risk-at-risk">
                    3
                  </p>
                  <p className="text-[10px] text-text-secondary">At risk</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-2xl font-semibold tabular-nums text-brand-600">
                    11
                  </p>
                  <p className="text-[10px] text-text-secondary">Recovered</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-2xl font-semibold tabular-nums text-text-primary">
                    24
                  </p>
                  <p className="text-[10px] text-text-secondary">Active</p>
                </div>
              </div>

              <div className="space-y-2">
                <DemoPatientRow
                  icon={<AlertCircle className="h-4 w-4 text-risk-critical" />}
                  bgClass="bg-risk-critical/10"
                  name="Sample Patient"
                  reason="Follow-up overdue by 5 days"
                />
                <DemoPatientRow
                  icon={<TrendingUp className="h-4 w-4 text-risk-watch" />}
                  bgClass="bg-risk-watch/10"
                  name="Another Patient"
                  reason="1 day past expected visit"
                />
              </div>
            </div>

            <p className="mb-6 text-center text-xs text-text-muted">
              Ruthva automatically detects patients dropping off treatment and
              helps bring them back via WhatsApp
            </p>

            <div className="mt-auto flex gap-3">
              <BackButton onClick={() => setStep(1)} />
              <NextButton
                onClick={() => setStep(3)}
                label="Add your first patient"
              />
            </div>
          </>
        )}

        {/* Step 3: Add First Patient */}
        {step === 3 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-text-primary">
                Add your first patient
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Takes about 20 seconds
              </p>
            </div>

            <div className="space-y-4">
              <InputField
                id="patientName"
                label="Patient Name"
                value={patientName}
                onChange={setPatientName}
                placeholder="Ramesh Kumar"
                autoFocus
              />
              <InputField
                id="patientPhone"
                label="Patient Phone (WhatsApp)"
                type="tel"
                inputMode="tel"
                value={patientPhone}
                onChange={setPatientPhone}
                placeholder="+91 98765 43210"
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Treatment Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <PillButton
                      key={opt.value}
                      label={opt.label}
                      selected={durationDays === opt.value}
                      onClick={() => setDurationDays(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">
                  Follow-up Frequency
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <PillButton
                      key={opt.value}
                      label={opt.label}
                      selected={followupIntervalDays === opt.value}
                      onClick={() => setFollowupIntervalDays(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-text-muted">
                By adding a patient, you confirm they have given consent to
                receive WhatsApp messages from {displayClinic}.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <BackButton onClick={() => setStep(2)} />
              <NextButton
                onClick={() => setStep(4)}
                disabled={
                  !patientName.trim() || patientPhone.trim().length < 10
                }
              />
            </div>
          </>
        )}

        {/* Step 4: Message Preview */}
        {step === 4 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-text-primary">
                Here&apos;s what {displayName} will receive
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                This message is sent automatically &mdash; you don&apos;t need
                to do anything
              </p>
            </div>

            {/* WhatsApp-style message bubble */}
            <div className="mb-6 rounded-xl border border-border bg-[#e5ded8] p-4">
              <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-4 py-3 shadow-sm">
                <p className="mb-2 text-sm leading-relaxed text-neutral-900">
                  Vanakkam{" "}
                  <span role="img" aria-label="namaste">
                    🙏
                  </span>
                </p>
                <p className="mb-3 text-sm leading-relaxed text-neutral-900">
                  Just a quick check from {displayClinic}.
                </p>
                <p className="mb-3 text-sm leading-relaxed text-neutral-900">
                  Were you able to continue treatment today?
                </p>
                <div className="space-y-1.5">
                  <div className="rounded-md bg-white/60 px-3 py-1.5 text-center text-sm">
                    ✅ Yes, I took my medicine
                  </div>
                  <div className="rounded-md bg-white/60 px-3 py-1.5 text-center text-sm">
                    ⚠️ Missed today
                  </div>
                  <div className="rounded-md bg-white/60 px-3 py-1.5 text-center text-sm">
                    ❓ Need help
                  </div>
                </div>
                <p className="mt-2 text-right text-[10px] text-neutral-500">
                  9:00 AM
                </p>
              </div>
            </div>

            <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <p className="text-xs leading-relaxed text-text-secondary">
                This check-in is sent daily for the first 21 days, then every 2
                days. If {displayName} stops responding, Ruthva will
                automatically alert you on the dashboard.
              </p>
            </div>

            <div className="mt-auto flex gap-3">
              <BackButton onClick={() => setStep(3)} />
              <NextButton
                onClick={() => {
                  setStep(5);
                  runSimulation();
                }}
                label="See what happens next"
              />
            </div>
          </>
        )}

        {/* Step 5: Outcome Simulation */}
        {step === 5 && (
          <>
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-text-primary">
                What happens when someone misses a visit
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Watch how Ruthva detects and recovers patients
              </p>
            </div>

            <div className="mb-6 space-y-3">
              <SimStep
                active={simPhase !== "idle"}
                icon={<Clock className="h-4 w-4 text-brand-600" />}
                iconBg="bg-brand-100"
                title="Day 7 — Visit expected"
                description={`${displayName}'s follow-up visit is due`}
              />
              <SimStep
                active={["day10", "recovery", "done"].includes(simPhase)}
                icon={<AlertCircle className="h-4 w-4 text-risk-at-risk" />}
                iconBg="bg-risk-at-risk/10"
                title="Day 10 — Visit missed"
                description="3 days overdue, no confirmation received"
              />
              <SimStep
                active={["recovery", "done"].includes(simPhase)}
                icon={<MessageCircle className="h-4 w-4 text-risk-watch" />}
                iconBg="bg-risk-watch/10"
                title="Automatic recovery message sent"
                description={`"We noticed you missed your visit at ${displayClinic}..."`}
              />
              <SimStep
                active={simPhase === "done"}
                icon={<ShieldAlert className="h-4 w-4 text-risk-critical" />}
                iconBg="bg-risk-critical/10"
                title="Dashboard shows alert"
                description="You see exactly who needs attention and why"
              />
            </div>

            {simPhase === "done" && (
              <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  <p className="text-sm font-medium text-brand-700">
                    This all happens automatically
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  You just check your dashboard. Ruthva handles the rest.
                </p>
              </div>
            )}

            {error && (
              <p className="mb-4 text-sm text-risk-critical">{error}</p>
            )}

            <div className="mt-auto flex gap-3">
              <BackButton
                onClick={() => {
                  setStep(4);
                  setSimPhase("idle");
                }}
              />
              <button
                onClick={handleComplete}
                disabled={loading || simPhase !== "done"}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Setting up..." : "Start using Ruthva"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Shared Components ── */

function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "tel";
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

function PillButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? "border-brand-500 bg-brand-50 text-brand-700"
          : "border-border bg-surface text-text-secondary hover:border-brand-300"
      }`}
    >
      {label}
    </button>
  );
}

function NextButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label || "Continue"}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-lg border border-border px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-raised"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

function DemoPatientRow({
  icon,
  bgClass,
  name,
  reason,
}: {
  icon: React.ReactNode;
  bgClass: string;
  name: string;
  reason: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface p-2.5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${bgClass}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-text-primary">{name}</p>
        <p className="text-[10px] text-text-muted">{reason}</p>
      </div>
    </div>
  );
}

function SimStep({
  active,
  icon,
  iconBg,
  title,
  description,
}: {
  active: boolean;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-500 ${
        active
          ? "border-border bg-surface-raised opacity-100 translate-y-0"
          : "border-transparent bg-transparent opacity-0 translate-y-2"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
