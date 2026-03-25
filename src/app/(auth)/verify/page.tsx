"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppLogo } from "@/components/branding/app-logo";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const isDemo = email.toLowerCase() === "demo@ruthva.com";
  const [code, setCode] = useState(isDemo ? "123456" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError("");

    // Auth.js verifies via callback URL with token + email — must be a full page navigation
    const callbackUrl = `/api/auth/callback/resend?token=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent("/")}`;
    window.location.href = callbackUrl;
  }

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
          <div className="mx-auto mb-6 flex items-center justify-center">
            <AppLogo priority className="h-10 sm:h-11" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Enter your code
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            We sent a 6-digit login code to{" "}
            <span className="font-medium text-text-primary">
              {email || "your email"}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            autoFocus
            className="block w-full rounded-lg border border-border bg-surface px-4 py-4 text-center text-2xl font-semibold tracking-[0.3em] text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />

          {error && <p className="text-center text-sm text-risk-critical">{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>
        </form>

        {isDemo ? (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-brand-700">
              Demo account — code is pre-filled. Just click verify!
            </p>
          </div>
        ) : (
          <p className="mt-6 text-center text-xs text-text-muted">
            Didn&apos;t receive the code? Check your spam folder or{" "}
            <Link href="/login" className="text-brand-600 underline">
              try again
            </Link>
          </p>
        )}
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
