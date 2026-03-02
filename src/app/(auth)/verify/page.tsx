"use client";

import { useSearchParams } from "next/navigation";
import { Leaf, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
            <Leaf className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-xl font-semibold text-text-primary">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            We sent a 6-digit login code to{" "}
            <span className="font-medium text-text-primary">{email || "your email"}</span>
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-4 text-center">
          <p className="text-sm text-text-secondary">
            Enter the code from your email to sign in. The code expires in 10
            minutes.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Didn&apos;t receive the code? Check your spam folder or{" "}
          <Link href="/login" className="text-brand-600 underline">
            try again
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  );
}
