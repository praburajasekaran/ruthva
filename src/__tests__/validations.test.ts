import { describe, it, expect } from "vitest";
import { integrationStartJourneySchema } from "@/lib/validations";

describe("integrationStartJourneySchema", () => {
  const validPayload = {
    patientName: "Test Patient",
    patientPhone: "9876543210",
    durationDays: 30,
    followupIntervalDays: 7,
    consentGiven: true,
    consentTimestamp: "2026-03-12T10:30:00+05:30",
    consentMethod: "checkbox_in_consultation_modal",
    consentCapturedBy: "dr-prabu",
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

  // ─── Consent Audit Trail Tests (DPDP Act 2023) ──────────────────────────

  it("rejects missing consentTimestamp when consentGiven is true", () => {
    const { consentTimestamp, ...rest } = validPayload;
    const result = integrationStartJourneySchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes("consentTimestamp"),
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("DPDP Act 2023");
    }
  });

  it("rejects missing consentMethod when consentGiven is true", () => {
    const { consentMethod, ...rest } = validPayload;
    const result = integrationStartJourneySchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes("consentMethod"),
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("DPDP Act 2023");
    }
  });

  it("rejects missing consentCapturedBy when consentGiven is true", () => {
    const { consentCapturedBy, ...rest } = validPayload;
    const result = integrationStartJourneySchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes("consentCapturedBy"),
      );
      expect(issue).toBeDefined();
      expect(issue?.message).toContain("DPDP Act 2023");
    }
  });

  it("rejects invalid consentTimestamp format", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      consentTimestamp: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("accepts consentTimestamp with UTC offset", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      consentTimestamp: "2026-03-12T05:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts consentTimestamp with IST offset", () => {
    const result = integrationStartJourneySchema.safeParse({
      ...validPayload,
      consentTimestamp: "2026-03-12T10:30:00+05:30",
    });
    expect(result.success).toBe(true);
  });

  it("preserves all consent fields in parsed output", () => {
    const result = integrationStartJourneySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.consentTimestamp).toBe("2026-03-12T10:30:00+05:30");
      expect(result.data.consentMethod).toBe(
        "checkbox_in_consultation_modal",
      );
      expect(result.data.consentCapturedBy).toBe("dr-prabu");
    }
  });
});
