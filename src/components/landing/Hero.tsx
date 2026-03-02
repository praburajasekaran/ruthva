"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function Hero() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-50 via-surface to-surface"></div>

            <div className="mx-auto max-w-5xl px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="mb-6 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                        <span className="mr-2 flex h-2 w-2 rounded-full bg-brand-500"></span>
                        Built exclusively for AYUSH Clinics
                    </span>
                    <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl md:text-7xl">
                        Detect disappearing patients <br className="hidden md:block" />
                        <span className="text-brand-600">and bring them back.</span>
                    </h1>
                    <p className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary sm:text-xl">
                        The Patient Continuity System that tracks treatment adherence automatically, finds at-risk patients, and engages them via WhatsApp before they drop out.
                    </p>

                    <div className="flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row">
                        <Link
                            href="/login"
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-8 text-base font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-700 hover:shadow-brand-500/40 active:scale-95 sm:w-auto"
                        >
                            Start using Ruthva <ArrowRight className="h-5 w-5" />
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="flex h-12 w-full items-center justify-center rounded-lg border border-border bg-surface px-8 text-base font-medium text-text-primary transition-colors hover:bg-surface-sunken sm:w-auto"
                        >
                            See how it works
                        </Link>
                    </div>

                    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-text-secondary">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-brand-500" /> WhatsApp Integration
                        </span>
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-brand-500" /> Zero Software to Learn
                        </span>
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-brand-500" /> Runs on Autopilot
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
