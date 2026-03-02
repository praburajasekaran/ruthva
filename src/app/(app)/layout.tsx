import { requireClinic } from "@/lib/session";
import { BottomNav } from "./bottom-nav";
import { SideNav } from "./side-nav";
import { AppLogo } from "@/components/branding/app-logo";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinic } = await requireClinic();

  return (
    <div className="min-h-dvh bg-surface lg:flex">
      <SideNav clinicName={clinic.name} />

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur-sm lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <AppLogo className="h-7 w-auto" priority />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-base font-semibold text-text-primary">Ruthva Console</h1>
            <p className="text-sm text-text-secondary">Treatment continuity workspace</p>
          </div>
          <span className="max-w-[220px] truncate text-sm font-medium text-text-secondary">
            {clinic.name}
          </span>
        </header>

        <main className="flex-1 pb-20 lg:bg-surface-raised/40 lg:px-8 lg:py-8 lg:pb-8">
          <div className="h-full rounded-2xl lg:border lg:border-border lg:bg-surface lg:shadow-sm">
            {children}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
