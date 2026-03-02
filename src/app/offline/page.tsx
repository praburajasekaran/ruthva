import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <WifiOff className="mb-4 h-12 w-12 text-text-muted" />
      <h1 className="text-lg font-semibold text-text-primary">
        You&apos;re offline
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Dashboard will sync when connected
      </p>
    </div>
  );
}
