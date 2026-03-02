"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, MessageCircleHeart, UserPlus, Activity, PlayCircle } from "lucide-react";

export function OnboardingSimulation() {
    const [activeStep, setActiveStep] = useState(1);

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

                <div className="grid gap-8 lg:gap-16 lg:grid-cols-12 items-center">
                    {/* Timeline Text */}
                    <div className="lg:col-span-5 space-y-4 lg:space-y-6">
                        <FeatureStep
                            number={1}
                            title="Add a patient (takes 20s)"
                            description="Input only their Name, Phone, and Treatment Duration. Defaults handle the rest."
                            Icon={UserPlus}
                            isActive={activeStep === 1}
                            onClick={() => setActiveStep(1)}
                        >
                            <StepOneUI />
                        </FeatureStep>
                        <FeatureStep
                            number={2}
                            title="Silent Monitoring"
                            description="System instantly creates events for the journey, expected visits, and adherence checks."
                            Icon={Activity}
                            isActive={activeStep === 2}
                            onClick={() => setActiveStep(2)}
                        >
                            <StepTwoUI />
                        </FeatureStep>
                        <FeatureStep
                            number={3}
                            title="Risk Detected & Recovered"
                            description="When a patient misses a milestone, Ruthva triggers an automated WhatsApp intervention."
                            Icon={MessageCircleHeart}
                            isActive={activeStep === 3}
                            onClick={() => setActiveStep(3)}
                        >
                            <StepThreeUI />
                        </FeatureStep>
                    </div>

                    {/* Visual Simulator (Desktop Only) */}
                    <div className="hidden lg:flex lg:col-span-7 relative min-h-[400px] lg:h-[500px] w-full items-center justify-center pt-4 lg:pt-0">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-100/40 to-transparent blur-3xl rounded-full" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-full max-w-md"
                            >
                                {activeStep === 1 && <StepOneUI />}
                                {activeStep === 2 && <StepTwoUI />}
                                {activeStep === 3 && <StepThreeUI />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureStep({
    number,
    title,
    description,
    Icon,
    isActive,
    onClick,
    children
}: {
    number: number;
    title: string;
    description: string;
    Icon: any;
    isActive: boolean;
    onClick: () => void;
    children?: React.ReactNode;
}) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer transition-all duration-300 p-4 sm:p-5 rounded-2xl ${isActive ? 'bg-brand-50 shadow-sm border border-brand-100 lg:scale-105' : 'hover:bg-gray-50 opacity-60 hover:opacity-100 border border-transparent'
                }`}
        >
            <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-4 transition-colors ${isActive ? 'bg-brand-500 text-white ring-brand-100 border border-brand-600' : 'bg-white text-brand-700 ring-gray-50 border border-brand-200'
                        }`}>
                        {isActive ? <Icon className="w-5 h-5 pointer-events-none" /> : number}
                    </div>
                </div>
                <div>
                    <h3 className={`text-lg font-bold mb-1 flex items-center gap-2 transition-colors ${isActive ? 'text-brand-900' : 'text-text-primary'
                        }`}>
                        {title}
                    </h3>
                    <p className="text-text-secondary leading-relaxed text-sm">{description}</p>
                </div>
            </div>

            {/* Mobile Visual Simulator (Accordion) */}
            <AnimatePresence>
                {isActive && children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="lg:hidden overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StepOneUI() {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden pointer-events-none">
            <div className="border-b border-border bg-gray-50 px-6 py-4">
                <h4 className="font-semibold flex items-center gap-2 text-text-primary">
                    <UserPlus className="w-5 h-5 text-brand-600" />
                    New Patient Profile
                </h4>
            </div>
            <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient Name</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        Rajesh Kumar
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone Number</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary">
                        +91 98765 43210
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Treatment Duration</label>
                    <div className="w-full h-10 bg-gray-50 border border-gray-200 rounded-md flex items-center px-3 text-sm text-text-primary flex justify-between">
                        <span>30 Days (Panchakarma)</span>
                        <div className="w-4 h-4 text-brand-500"><Clock className="w-4 h-4" /></div>
                    </div>
                </div>
                <button className="w-full mt-2 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2">
                    Start Monitoring <PlayCircle className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function StepTwoUI() {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col h-full pointer-events-none">
            <div className="border-b border-border bg-gray-50 px-6 py-4 flex justify-between items-center">
                <h4 className="font-semibold flex items-center gap-2 text-text-primary">
                    <Activity className="w-5 h-5 text-brand-600" />
                    Patient Journey
                </h4>
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium shadow-sm">Active</span>
            </div>
            <div className="p-6 flex-1">
                <div className="relative border-l-2 border-brand-200 ml-3 space-y-6">
                    <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-500 ring-4 ring-white" />
                        <h5 className="text-sm font-bold text-text-primary">Day 1: Treatment Started</h5>
                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">Profile created & welcome message sent.</p>
                    </div>
                    <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-500 ring-4 ring-white" />
                        <h5 className="text-sm font-bold text-text-primary">Day 3: Medication Check</h5>
                        <p className="text-xs text-text-secondary mt-1">Patient confirmed taking Kashayam.</p>
                    </div>
                    <div className="relative pl-6">
                        <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-yellow-400 ring-4 ring-white shadow-sm flex items-center justify-center" />
                        <h5 className="text-sm font-bold text-text-primary">Day 7: Follow-up Visit</h5>
                        <p className="text-xs text-text-secondary mt-1 text-yellow-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 animate-pulse" /> Waiting for response...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepThreeUI() {
    return (
        <div className="relative rounded-2xl border border-border bg-white shadow-2xl p-4 sm:p-5 pointer-events-none">
            <div className="rounded-xl overflow-hidden bg-[#e5ddd5]">
                <div className="bg-[#075e54] text-white p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircleHeart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold leading-tight text-sm">Sri Lakshmi Siddha Clinic</h4>
                        <p className="text-[10px] text-white/80">Automated Assistant</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 min-h-[250px] flex flex-col justify-end text-sm">
                    <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-[85%] self-start">
                        <p className="text-[#111b21] mb-2 leading-relaxed text-[13px]">
                            Vanakkam 🙏<br /><br />
                            Just a quick check from Sri Lakshmi Siddha Clinic. Did you take your medicines today?
                        </p>
                        <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                            <div className="text-center py-2 bg-blue-50 text-blue-600 rounded font-medium text-xs">✅ Yes I did</div>
                            <div className="text-center py-2 bg-blue-50 text-blue-600 rounded font-medium text-xs">⚠️ Missed today</div>
                        </div>
                        <p className="text-[10px] text-right text-gray-400 mt-2">10:42 AM</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex items-start gap-3 p-3 bg-brand-50 rounded-lg border border-brand-100 text-brand-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <p>This triggers when adherence drops. Dashboards update if they click "Missed today".</p>
            </div>
        </div>
    );
}
