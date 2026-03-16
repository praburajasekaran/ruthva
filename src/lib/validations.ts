import { z } from "zod";

export const createClinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required").max(100),
  doctorName: z.string().min(1, "Doctor name is required").max(100),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number required").max(15),
});

export const updateClinicSchema = z.object({
  name: z.string().min(1, "Clinic name is required").max(100).optional(),
  doctorName: z.string().min(1, "Doctor name is required").max(100).optional(),
  whatsappNumber: z
    .string()
    .min(10, "Valid WhatsApp number required")
    .max(15)
    .optional(),
});

export const createPatientSchema = z.object({
  name: z.string().min(1, "Patient name is required").max(100),
  phone: z.string().min(10, "Valid phone number required").max(15),
  durationDays: z.number().int().min(7).max(180),
  followupIntervalDays: z.number().int().min(1).max(30),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Patient consent is required",
  }),
});

export const updatePatientSchema = z.object({
  name: z.string().min(1, "Patient name is required").max(100),
  phone: z.string().min(10, "Valid phone number required").max(15),
  durationDays: z.number().int().min(7).max(180),
  followupIntervalDays: z.number().int().min(1).max(30),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Patient consent is required",
  }),
});

// ─── SSO / Onboarding Schemas ───────────────────────────────────────────────

export const PRACTICE_TYPES = ["ayurveda", "siddha", "homeopathy"] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

/** Label/value pairs for UI dropdowns and pill selectors. */
export const PRACTICE_TYPE_OPTIONS = PRACTICE_TYPES.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));

export const setupClinicSchema = z.object({
  doctorName: z.string().min(1, "Doctor name is required").max(100),
  registrationNumber: z.string().min(1, "Registration number is required").max(50),
  clinicName: z.string().min(1, "Clinic name is required").max(100),
  clinicAddress: z.string().min(1, "Clinic address is required").max(500),
  whatsappNumber: z.string().min(10, "Valid WhatsApp number required").max(15),
  practiceType: z.enum(PRACTICE_TYPES, {
    message: "Select a practice type",
  }),
});

// ─── Integration Schemas ────────────────────────────────────────────────────

export const integrationStartJourneySchema = z.object({
  patientName: z.string().min(1, "Patient name is required").max(100),
  patientPhone: z.string().min(10, "Valid phone number required").max(15),
  durationDays: z.number().int().min(7).max(180),
  followupIntervalDays: z.number().int().min(1).max(30),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Patient consent is required",
  }),
  externalConsultationId: z.string().min(1).max(200).optional(),
});

// ─── Activation Schema ──────────────────────────────────────────────────────

export const activatePatientSchema = z.object({
  name: z.string().min(1, "Patient name is required").max(100),
  phone: z.string().min(10, "Valid phone number required").max(15),
  durationDays: z.number().int().min(7).max(180),
  followupIntervalDays: z.number().int().min(1).max(30),
  treatmentStartedAgo: z.enum(["today", "7days", "14days", "21days", "custom"]),
  customStartDate: z.string().optional(),
  lastVisitStatus: z.enum(["recent", "unsure", "overdue"]),
  consentGiven: z.boolean().refine((v) => v === true, {
    message: "Patient consent is required",
  }),
});
