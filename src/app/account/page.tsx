import { requireClinic } from "@/lib/session";
import { AppLogo } from "@/components/branding/app-logo";
import AccountActions from "./account-actions";

const CLINIC_OS_API_URL = process.env.CLINIC_OS_API_URL ?? "";
const RUTHVA_INTEGRATION_SECRET = process.env.RUTHVA_INTEGRATION_SECRET ?? "";

async function fetchUsage(userId: string): Promise<{ patient_count: number; patient_limit: number } | null> {
  if (!CLINIC_OS_API_URL || !RUTHVA_INTEGRATION_SECRET) return null;
  try {
    const res = await fetch(
      `${CLINIC_OS_API_URL}/api/v1/auth/sso/usage/?ruthva_user_id=${encodeURIComponent(userId)}`,
      {
        headers: {
          "X-Ruthva-Secret": RUTHVA_INTEGRATION_SECRET,
          "Content-Type": "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  const { session, clinic } = await requireClinic();

  const usage = await fetchUsage(session.user.id);
  const patientCount = usage?.patient_count ?? 0;
  const patientLimit = usage?.patient_limit ?? 200;
  const usagePercent = patientLimit > 0 ? Math.min(100, Math.round((patientCount / patientLimit) * 100)) : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between">
            <AppLogo className="h-10 w-auto" priority />
            <a
              href="/"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Back to clinic
            </a>
          </div>

          <h1 className="text-xl font-semibold text-text-primary">Account</h1>
          <p className="mt-1 mb-8 text-sm text-text-secondary">
            Manage your plan and account settings.
          </p>

          {/* Plan */}
          <section className="mb-6 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Plan</h2>
            <p className="mt-1 text-2xl font-bold text-brand-600">Starter</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Up to {patientLimit} active patients
            </p>
          </section>

          {/* Usage */}
          <section className="mb-6 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Usage</h2>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{patientCount}</span> / {patientLimit} patients
                </span>
                <span className="text-xs text-text-muted">{usagePercent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent >= 90
                      ? "bg-risk-critical"
                      : usagePercent >= 70
                        ? "bg-risk-at-risk"
                        : "bg-brand-500"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          </section>

          {/* Clinic info */}
          <section className="mb-6 rounded-lg border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-text-primary">Clinic</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Name</dt>
                <dd className="font-medium text-text-primary">{clinic.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Doctor</dt>
                <dd className="font-medium text-text-primary">{clinic.doctorName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">WhatsApp</dt>
                <dd className="font-medium text-text-primary">{clinic.whatsappNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Email</dt>
                <dd className="font-medium text-text-primary">{session.user.email}</dd>
              </div>
            </dl>
          </section>

          {/* Actions (client component for interactivity) */}
          <AccountActions />
        </div>
      </div>
    </div>
  );
}
