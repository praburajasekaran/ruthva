import { WifiOff } from "lucide-react";
import { AppLogo } from "@/components/branding/app-logo";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <AppLogo className="mb-8 h-10 sm:h-11" priority />
      <WifiOff className="mb-4 h-12 w-12 text-text-muted" />
      <h1 className="text-xl font-semibold text-text-primary">
        You&apos;re offline
      </h1>
      <p className="mt-2 text-base text-text-secondary">
        Dashboard will sync when connected
      </p>
    </div>
  );
}
