"use client";

import { motion } from "framer-motion";
import { BookX, BotMessageSquare } from "lucide-react";

export function ProblemSolution() {
    return (
        <section className="bg-surface-sunken py-20 px-6 sm:py-32" id="notebook-objection">
            <div className="mx-auto max-w-5xl">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl text-balance">
                        Stop relying on notebooks and memory.
                    </h2>
                    <p className="mt-4 text-lg text-text-secondary">
                        Your clinic operates in real-time chaos. Memory fails. Automated continuity won't.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
                    {/* The Notebook Way */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col rounded-2xl border border-red-100 bg-red-50/50 p-8"
                    >
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-100/50 text-red-600">
                            <BookX className="h-6 w-6" />
                        </div>
                        <h3 className="mb-4 text-xl font-bold text-red-950">The Notebook Way</h3>
                        <ul className="mb-8 space-y-3 text-red-800">
                            <li className="flex items-start">
                                <span className="mr-3 text-red-500">❌</span>
                                Remember treatment durations manually
                            </li>
                            <li className="flex items-start">
                                <span className="mr-3 text-red-500">❌</span>
                                Scan pages to find who missed today
                            </li>
                            <li className="flex items-start">
                                <span className="mr-3 text-red-500">❌</span>
                                Mentally calculate delays
                            </li>
                            <li className="flex items-start">
                                <span className="mr-3 text-red-500">❌</span>
                                Hope someone remembers to call them
                            </li>
                        </ul>
                        <div className="mt-auto border-t border-red-200 pt-6">
                            <p className="font-medium text-red-900">
                                Result: <span className="text-red-600 underline decoration-red-300 underline-offset-4">Lost continuity. Lost revenue.</span>
                            </p>
                        </div>
                    </motion.div>

                    {/* The Ruthva Way */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col rounded-2xl border border-brand-200 bg-surface p-8 shadow-xl shadow-brand-900/5"
                    >
                        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                            <BotMessageSquare className="h-6 w-6" />
                        </div>
                        <h3 className="mb-4 text-xl font-bold text-text-primary">The Ruthva Way</h3>
                        <ul className="mb-8 space-y-3 text-text-secondary">
                            <li className="flex items-start text-text-primary">
                                <span className="mr-3 text-brand-500">✅</span>
                                System detects emerging risk continuously
                            </li>
                            <li className="flex items-start text-text-primary">
                                <span className="mr-3 text-brand-500">✅</span>
                                WhatsApp check-ins sent automatically
                            </li>
                            <li className="flex items-start text-text-primary">
                                <span className="mr-3 text-brand-500">✅</span>
                                Patient responds via quick replies
                            </li>
                            <li className="flex items-start text-text-primary">
                                <span className="mr-3 text-brand-500">✅</span>
                                At-risk flag surfaces on your dashboard
                            </li>
                        </ul>
                        <div className="mt-auto border-t border-brand-100 pt-6">
                            <p className="font-medium text-text-primary">
                                Result: <span className="text-brand-600 underline decoration-brand-300 underline-offset-4">Recovered patients. Protected reputation.</span>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
