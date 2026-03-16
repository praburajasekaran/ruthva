"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";

export default function AccountActions() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setExportLoading(true);
    setExportMessage("");
    setError("");
    try {
      const res = await fetch("/api/account/export", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }
      setExportMessage("Export started. You'll receive a download link by email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleClose() {
    setCloseLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/close", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to close account");
      }
      // Redirect to login with message
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close account");
      setCloseLoading(false);
    }
  }

  return (
    <>
      {/* Export Data */}
      <section className="mb-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-primary">Export Data</h2>
        <p className="mt-1 text-xs text-text-muted">
          Download all your clinic data as CSV files.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportLoading}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {exportLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export all data
        </button>
        {exportMessage && (
          <p className="mt-2 text-sm text-brand-600">{exportMessage}</p>
        )}
      </section>

      {/* Close Account */}
      <section className="rounded-lg border border-risk-at-risk/30 bg-risk-at-risk/5 p-5">
        <h2 className="text-sm font-semibold text-risk-critical">Close Account</h2>
        <p className="mt-1 text-xs text-text-muted">
          Permanently deactivate your account. You will lose access to your clinic data.
        </p>
        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-risk-critical/30 px-4 py-2 text-sm font-medium text-risk-critical transition-colors hover:bg-risk-critical/10"
          >
            <Trash2 className="h-4 w-4" />
            Close my account
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium text-risk-critical">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={closeLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-risk-critical px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {closeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Yes, close my account"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {error && <p className="mt-4 text-sm text-risk-critical">{error}</p>}
    </>
  );
}
