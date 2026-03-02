"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export function VisitButton({ journeyId }: { journeyId: string }) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "pending" | "confirmed" | "failed">("idle");

  async function handleConfirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus("pending");

    try {
      const res = await fetch("/api/journeys/confirm-visit", {
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
        <CheckCircle className="h-4 w-4" />
        Visited today
      </button>
    );
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={status === "pending"}
      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
    >
      <CheckCircle className="h-4 w-4" />
      {status === "pending" ? "Confirming..." : status === "failed" ? "Retry" : "Mark Visited"}
    </button>
  );
}
