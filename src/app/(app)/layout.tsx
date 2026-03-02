import { requireClinic } from "@/lib/session";
import { BottomNav } from "./bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clinic } = await requireClinic();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-surface px-4">
        <span className="text-sm font-semibold text-brand-700">Ruthva</span>
        <span className="text-xs text-text-secondary truncate max-w-[180px]">
          {clinic.name}
        </span>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <BottomNav />
    </div>
  );
}
