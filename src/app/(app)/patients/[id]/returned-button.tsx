"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";

export function ReturnedButton({ journeyId }: { journeyId: string }) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");

  async function handleReturn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus("pending");

    try {
      const res = await fetch("/api/journeys/mark-returned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journeyId }),
      });

      if (!res.ok) throw new Error("Failed");
      setStatus("confirmed");
      router.refresh();
    } catch {
      setStatus("failed");
      submittingRef.current = false;
    }
  }

  if (status === "confirmed") {
    return (
      <button
        disabled
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-risk-stable/10 px-4 py-3 text-sm font-medium text-risk-stable"
      >
        <UserCheck className="h-4 w-4" />
        Returned
      </button>
    );
  }

  return (
    <button
      onClick={handleReturn}
      disabled={status === "pending"}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-600 px-4 py-3 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50"
    >
      <UserCheck className="h-4 w-4" />
      {status === "pending" ? "Marking..." : status === "failed" ? "Retry" : "Mark Returned"}
    </button>
  );
}
