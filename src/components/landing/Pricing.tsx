"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

export function Pricing() {
    return (
        <section className="bg-surface py-20 px-6 sm:py-32" id="pricing">
            <div className="mx-auto max-w-5xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl text-balance">
                        Simple pricing. Clear ROI.
                    </h2>
                    <p className="mt-4 text-lg text-text-secondary">
                        Pay a flat fee, recover lost patient revenue, and protect your clinic's reputation.
                    </p>
                </div>

                <div className="mx-auto max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="rounded-3xl shadow-xl shadow-brand-900/10 border border-border bg-white p-8 sm:p-10 relative overflow-hidden"
                    >
                        {/* The Secret Pricing Lever - Anchor Metric */}
                        <div className="absolute top-0 inset-x-0 bg-brand-600 py-2.5 text-center text-sm font-semibold text-white">
                            Revenue Protected This Month: ₹72,000*
                        </div>

                        <div className="mt-6 mb-8">
                            <h3 className="text-2xl font-semibold text-text-primary">Starter Plan</h3>
                            <p className="text-text-secondary text-sm mt-2">Perfect for independent AYUSH practitioners looking for immediate continuity wins.</p>

                            <div className="mt-6 flex items-baseline gap-x-2">
                                <span className="text-5xl font-bold tracking-tight text-text-primary">₹1,999</span>
                                <span className="text-sm font-semibold leading-6 text-text-secondary">/month</span>
                            </div>
                        </div>

                        <ul className="space-y-4 text-sm leading-6 text-text-secondary mb-8">
                            <li className="flex gap-x-3 text-text-primary">
                                <Check className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                Up to 100 active treatment journeys
                            </li>
                            <li className="flex gap-x-3 text-text-primary">
                                <Check className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                Automated Adherence Checks
                            </li>
                            <li className="flex gap-x-3 text-text-primary">
                                <Check className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                Recovery Automation & Alerts
                            </li>
                            <li className="flex gap-x-3 text-text-primary">
                                <Check className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                WhatsApp Messaging Included
                            </li>
                        </ul>

                        <Link
                            href="/login"
                            className="mt-8 block w-full rounded-md bg-brand-600 px-3.5 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
                        >
                            Start recovering patients today
                        </Link>

                        <p className="text-center text-xs text-text-muted mt-4">
                            *Based on 4-5 average patient recoveries / month
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
