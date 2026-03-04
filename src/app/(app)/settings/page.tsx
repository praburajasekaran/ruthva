import { requireClinic } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { User, Building2, LogOut } from "lucide-react";
import ClinicEditForm from "./ClinicEditForm";

export default async function SettingsPage() {
  const { session, clinic } = await requireClinic();

  return (
    <div className="app-page px-4 py-5 lg:max-w-3xl lg:px-8 lg:py-8">
      <h1 className="mb-5 text-2xl font-semibold text-text-primary">Settings</h1>

      <div className="space-y-3">
        {/* Clinic Info */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-medium uppercase text-text-muted">
              Clinic
            </span>
            <ClinicEditForm
              name={clinic.name}
              doctorName={clinic.doctorName}
              whatsappNumber={clinic.whatsappNumber}
            />
          </div>
          <p className="text-base font-semibold text-text-primary">{clinic.name}</p>
          <p className="text-sm text-text-secondary">Dr. {clinic.doctorName}</p>
          <p className="mt-0.5 text-sm text-text-muted">{clinic.whatsappNumber}</p>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-medium uppercase text-text-muted">
              Account
            </span>
          </div>
          <p className="text-base text-text-primary">{session.user?.email}</p>
        </div>

        {/* Logout */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-base font-semibold text-risk-critical transition-colors hover:bg-surface-raised"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
