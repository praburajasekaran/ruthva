"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { AppLogo } from "@/components/branding/app-logo";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When clinic-os logs out, it redirects here with ?logout=true
  // to destroy the ruthva session and prevent auto-redirect back
  useEffect(() => {
    if (searchParams.get("logout") === "true") {
      signOut({ redirect: false });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("resend", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      } else {
        window.location.href = `/verify?email=${encodeURIComponent(email)}`;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <AppLogo priority className="h-10 sm:h-11" />
          </div>
          <p className="mt-2 text-base text-text-secondary">
            Clinic OS for Ayurveda
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              required
              autoFocus
              className="block w-full rounded-lg border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {error && (
            <p className="text-sm text-risk-critical">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Sending code..." : "Send login code"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-text-muted">
          We&apos;ll send a 6-digit code to your email
        </p>
      </div>
    </div>
  );
}
