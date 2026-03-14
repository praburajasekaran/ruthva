import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("hashPhone", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PHONE_HASH_KEY: "test-secret-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("produces a consistent HMAC hash for the same phone", async () => {
    const { hashPhone } = await import("@/lib/crypto");
    const hash1 = hashPhone("9876543210");
    const hash2 = hashPhone("9876543210");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different phones", async () => {
    const { hashPhone } = await import("@/lib/crypto");
    const hash1 = hashPhone("9876543210");
    const hash2 = hashPhone("9876543211");
    expect(hash1).not.toBe(hash2);
  });

  it("trims whitespace from phone before hashing", async () => {
    const { hashPhone } = await import("@/lib/crypto");
    const hash1 = hashPhone("9876543210");
    const hash2 = hashPhone("  9876543210  ");
    expect(hash1).toBe(hash2);
  });

  it("produces a hex string", async () => {
    const { hashPhone } = await import("@/lib/crypto");
    const hash = hashPhone("9876543210");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws when PHONE_HASH_KEY is not set", async () => {
    delete process.env.PHONE_HASH_KEY;
    const { hashPhone } = await import("@/lib/crypto");
    expect(() => hashPhone("9876543210")).toThrow("PHONE_HASH_KEY not configured");
  });
});
