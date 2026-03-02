"use client";

import { motion } from "framer-motion";
import { PlayCircle, Clock, AlertTriangle, MessageCircleHeart } from "lucide-react";

export function OnboardingSimulation() {
    return (
        <section className="bg-surface py-20 px-6 sm:py-32 relative overflow-hidden" id="how-it-works">
            <div className="mx-auto max-w-5xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl text-balance">
                        3 steps. Zero extra work.
                    </h2>
                    <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
                        You are staging a future reality preview. Add a patient in 20 seconds, and we monitor their 30-day journey.
                    </p>
                </div>

                <div className="grid gap-16 lg:grid-cols-12 items-center">
                    {/* Timeline Text */}
                    <div className="lg:col-span-5 space-y-12">
                        <FeatureStep
                            number="1"
                            title="Add a patient (takes 20 seconds)"
                            description="Input only their Name, Phone, and Treatment Duration. Defaults handle the rest."
                            Icon={Clock}
                            isActive={true}
                        />
                        <FeatureStep
                            number="2"
                            title="Silent Monitoring"
                            description="System instantly creates events for the journey, expected visits, and adherence checks."
                            Icon={PlayCircle}
                            isActive={false}
                        />
                        <FeatureStep
                            number="3"
                            title="Risk Detected & Recovered"
                            description="When a patient misses a milestone, Ruthva triggers an automated WhatsApp intervention."
                            Icon={AlertTriangle}
                            isActive={false}
                        />
                    </div>

                    {/* Visual Simulator */}
                    <div className="lg:col-span-7 relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/40 to-transparent blur-3xl rounded-full" />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ ease: "easeOut", duration: 0.5 }}
                            className="relative rounded-2xl border border-border bg-white shadow-2xl p-4 sm:p-6"
                        >
                            {/* WhatsApp UI Simulation */}
                            <div className="rounded-xl overflow-hidden bg-[#e5ddd5]">
                                {/* Header */}
                                <div className="bg-[#075e54] text-white p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <MessageCircleHeart className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold leading-tight">Sri Lakshmi Siddha Clinic</h4>
                                        <p className="text-xs text-white/80">Verified Healthcare Provider</p>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="p-4 sm:p-6 space-y-4 min-h-[300px] flex flex-col justify-end">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        whileInView={{ x: 0, opacity: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[85%]"
                                    >
                                        <p className="text-sm text-[#111b21] mb-2 leading-relaxed">
                                            Vanakkam 🙏<br /><br />
                                            Just a quick check from Sri Lakshmi Siddha Clinic. Were you able to continue treatment today?
                                        </p>
                                        {/* Quick Replies Buttons */}
                                        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                                            <div className="text-center py-2 bg-blue-50 text-blue-600 rounded cursor-pointer font-medium text-sm">✅ Yes</div>
                                            <div className="text-center py-2 bg-blue-50 text-blue-600 rounded cursor-pointer font-medium text-sm">⚠️ Missed today</div>
                                            <div className="text-center py-2 bg-blue-50 text-blue-600 rounded cursor-pointer font-medium text-sm">❓ Need help</div>
                                        </div>
                                        <p className="text-[10px] text-right text-gray-400 mt-2">10:42 AM</p>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Note from the system */}
                            <div className="mt-6 flex items-start gap-3 p-4 bg-brand-50 rounded-lg border border-brand-100 text-brand-900 text-sm">
                                <AlertTriangle className="w-5 h-5 text-brand-600 flex-shrink-0" />
                                <p>This message will be sent automatically. You don't need to do anything. Your dashboard updates if they click "Missed today".</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureStep({ number, title, description, Icon, isActive }: { number: string; title: string; description: string; Icon: any; isActive: boolean }) {
    return (
        <div className={`flex gap-4 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm ring-4 ring-white border border-brand-200">
                    {number}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                    {title}
                </h3>
                <p className="text-text-secondary leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
