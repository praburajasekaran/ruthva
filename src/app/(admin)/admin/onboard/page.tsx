"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function OnboardClinicPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{
        userId: string;
        clinicId: string;
    } | null>(null);

    // Form state
    const [email, setEmail] = useState("");
    const [doctorName, setDoctorName] = useState("");
    const [clinicName, setClinicName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [clinicEmail, setClinicEmail] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/onboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    doctorName: doctorName.trim(),
                    clinicName: clinicName.trim(),
                    whatsappNumber: whatsappNumber.trim(),
                    clinicEmail: clinicEmail.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? "Something went wrong");
            }

            setSuccess(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="px-4 py-8 lg:px-8 lg:py-8 max-w-lg lg:pt-8 pt-20">
                <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-7 w-7 text-green-700" />
                        </div>
                    </div>
                    <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                        Clinic Onboarded Successfully
                    </h2>
                    <p className="text-sm text-neutral-500 mb-2">
                        The clinic has been created. The doctor can now log in with:
                    </p>
                    <p className="text-sm font-medium text-neutral-900 bg-neutral-50 px-4 py-2 rounded-lg mb-6">
                        {email}
                    </p>
                    <p className="text-xs text-neutral-400 mb-6">
                        They will receive an OTP at the above email when they attempt to log
                        in at{" "}
                        <span className="font-medium text-neutral-600">/login</span>. No
                        welcome email is sent automatically.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setSuccess(null);
                                setEmail("");
                                setDoctorName("");
                                setClinicName("");
                                setWhatsappNumber("");
                                setClinicEmail("");
                            }}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                            Add Another
                        </button>
                        <Link
                            href="/admin/doctors"
                            className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a3a2a] text-white text-sm font-medium text-center hover:bg-[#0f2a1d] transition-colors"
                        >
                            View Doctors
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 py-6 lg:px-8 lg:py-8 max-w-lg lg:pt-8 pt-20">
            <Link
                href="/admin/doctors"
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Doctors
            </Link>

            <div className="mb-6">
                <h1 className="text-xl font-semibold text-neutral-900">
                    Onboard New Clinic
                </h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                    Manually create a clinic for a doctor. They can log in immediately
                    with their email.
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-xl border border-neutral-200 p-6 space-y-5"
            >
                {/* Doctor email */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Doctor Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="doctor@clinic.com"
                        autoFocus
                        className="block w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                    />
                    <p className="text-xs text-neutral-400 mt-1">
                        The doctor logs in using this email address
                    </p>
                </div>

                {/* Doctor name */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Doctor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Dr. Priya Sharma"
                        className="block w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                    />
                </div>

                <hr className="border-neutral-100" />

                {/* Clinic name */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Clinic Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder="Sri Ayush Wellness Centre"
                        className="block w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                    />
                </div>

                {/* WhatsApp number */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Clinic WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="block w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                    />
                </div>

                {/* Clinic email (optional) */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        Clinic Email{" "}
                        <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <input
                        type="email"
                        value={clinicEmail}
                        onChange={(e) => setClinicEmail(e.target.value)}
                        placeholder="info@clinic.com"
                        className="block w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/20 focus:border-[#1a3a2a]"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={
                        loading ||
                        !email ||
                        !doctorName ||
                        !clinicName ||
                        whatsappNumber.trim().length < 10
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#1a3a2a] text-white text-sm font-medium hover:bg-[#0f2a1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Creating clinic..." : "Create Clinic"}
                </button>
            </form>
        </div>
    );
}
