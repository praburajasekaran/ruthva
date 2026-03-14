import { describe, it, expect } from "vitest";
import { integrationStartJourneySchema } from "@/lib/validations";

describe("integrationStartJourneySchema", () => {
  const validPayload = {
    patientName: "Test Patient",
    patientPhone: "9876543210",
    durationDays: 30,
    followupIntervalDays: 7,
    consentGiven: true,
  };

  it("accepts a valid payload", () => {
    const result = integrationStartJourneySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts payload with externalConsultationId", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      externalConsultationId: "CONSULT-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing patientName", () => {
    const { patientName, ...rest } = validPayload;
    const result = integrationStartJourneySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing patientPhone", () => {
    const { patientPhone, ...rest } = validPayload;
    const result = integrationStartJourneySchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects phone shorter than 10 digits", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      patientPhone: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects consentGiven: false", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      consentGiven: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects durationDays below 7", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      durationDays: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects durationDays above 180", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      durationDays: 365,
    });
    expect(result.success).toBe(false);
  });

  it("rejects followupIntervalDays below 1", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      followupIntervalDays: 0,
    });
    expect(result.success).toBe(false);
  });
});
