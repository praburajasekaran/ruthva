"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn("resend", {
        email,
        redirect: true,
        callbackUrl: "/verify",
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Ruthva</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Treatment Continuity for Ayurveda
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
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 active:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
