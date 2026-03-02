import { requireClinic } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { User, Building2, LogOut } from "lucide-react";

export default async function SettingsPage() {
  const { session, clinic } = await requireClinic();

  return (
    <div className="px-4 py-4">
      <h1 className="mb-4 text-lg font-semibold text-text-primary">Settings</h1>

      <div className="space-y-3">
        {/* Clinic Info */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-medium uppercase text-text-muted">
              Clinic
            </span>
          </div>
          <p className="text-sm font-medium text-text-primary">{clinic.name}</p>
          <p className="text-xs text-text-secondary">Dr. {clinic.doctorName}</p>
        </div>

        {/* Account Info */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-text-muted" />
            <span className="text-xs font-medium uppercase text-text-muted">
              Account
            </span>
          </div>
          <p className="text-sm text-text-primary">{session.user?.email}</p>
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface p-4 text-sm font-medium text-risk-critical transition-colors hover:bg-surface-raised"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
