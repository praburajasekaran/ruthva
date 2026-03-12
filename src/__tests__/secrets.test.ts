import { describe, it, expect } from "vitest";
import { secretsEqual } from "@/lib/secrets";

describe("secretsEqual", () => {
  it("returns true for matching secrets", () => {
    expect(secretsEqual("my-secret", "my-secret")).toBe(true);
  });

  it("returns false for different secrets", () => {
    expect(secretsEqual("my-secret", "wrong-secret")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(secretsEqual("short", "much-longer-secret")).toBe(false);
  });

  it("returns false when first value is null", () => {
    expect(secretsEqual(null, "secret")).toBe(false);
  });

  it("returns false when second value is null", () => {
    expect(secretsEqual("secret", null)).toBe(false);
  });

  it("returns false when first value is undefined", () => {
    expect(secretsEqual(undefined, "secret")).toBe(false);
  });

  it("returns false when both are empty strings", () => {
    expect(secretsEqual("", "")).toBe(false);
  });

  it("is timing-safe (no short-circuit on first byte mismatch)", () => {
    // Can't truly verify timing safety in a unit test, but we verify
    // the function handles edge cases that would break Buffer comparison
    const a = "a".repeat(1000);
    const b = "b".repeat(1000);
    expect(secretsEqual(a, b)).toBe(false);
  });
});
