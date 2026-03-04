"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";

interface Props {
    name: string;
    doctorName: string;
    whatsappNumber: string;
}

export default function ClinicEditForm({
    name,
    doctorName,
    whatsappNumber,
}: Props) {
    const router = useRouter();
    const submittingRef = useRef(false);

    const [open, setOpen] = useState(false);
    const [clinicName, setClinicName] = useState(name);
    const [doctor, setDoctor] = useState(doctorName);
    const [wa, setWa] = useState(whatsappNumber);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    function handleOpen() {
        // Reset to latest server values on open
        setClinicName(name);
        setDoctor(doctorName);
        setWa(whatsappNumber);
        setError("");
        setSuccess(false);
        setOpen(true);
    }

    function handleCancel() {
        setOpen(false);
        setError("");
    }

    const isValid =
        clinicName.trim().length > 0 &&
        doctor.trim().length > 0 &&
        wa.trim().length >= 10;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (submittingRef.current || !isValid) return;
        submittingRef.current = true;
        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const res = await fetch("/api/clinic", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: clinicName.trim(),
                    doctorName: doctor.trim(),
                    whatsappNumber: wa.trim(),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update clinic");
            }

            setSuccess(true);
            router.refresh();

            // Close after a short delay so the user can see the tick
            setTimeout(() => {
                setOpen(false);
                setSuccess(false);
            }, 800);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    }

    return (
        <>
            {/* Edit trigger button */}
            <button
                onClick={handleOpen}
                aria-label="Edit clinic details"
                className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
                <Pencil className="h-3.5 w-3.5" />
                Edit
            </button>

            {/* Inline edit form */}
            {open && (
                <form
                    onSubmit={handleSubmit}
                    className="mt-4 space-y-4 border-t border-border pt-4"
                >
                    {/* Clinic Name */}
                    <div>
                        <label
                            htmlFor="settings-clinic-name"
                            className="mb-1.5 block text-sm font-medium text-text-primary"
                        >
                            Clinic Name
                        </label>
                        <input
                            id="settings-clinic-name"
                            type="text"
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                            required
                            autoFocus
                            className="block w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    {/* Doctor Name */}
                    <div>
                        <label
                            htmlFor="settings-doctor-name"
                            className="mb-1.5 block text-sm font-medium text-text-primary"
                        >
                            Doctor Name
                        </label>
                        <input
                            id="settings-doctor-name"
                            type="text"
                            value={doctor}
                            onChange={(e) => setDoctor(e.target.value)}
                            required
                            className="block w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                        <label
                            htmlFor="settings-whatsapp"
                            className="mb-1.5 block text-sm font-medium text-text-primary"
                        >
                            WhatsApp Number
                        </label>
                        <input
                            id="settings-whatsapp"
                            type="tel"
                            inputMode="tel"
                            value={wa}
                            onChange={(e) => setWa(e.target.value)}
                            required
                            className="block w-full rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>

                    {error && <p className="text-sm text-risk-critical">{error}</p>}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-50"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !isValid}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {success ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    Saved
                                </>
                            ) : loading ? (
                                "Saving…"
                            ) : (
                                "Save changes"
                            )}
                        </button>
                    </div>
                </form>
            )}
        </>
    );
}
