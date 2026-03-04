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
