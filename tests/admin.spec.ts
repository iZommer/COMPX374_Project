import { generateKeyPairSync } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { adminCredentials } from "../lib/admin";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function configure(key: string) {
  vi.stubEnv("FIREBASE_PROJECT_ID", "test-project");
  vi.stubEnv(
    "FIREBASE_CLIENT_EMAIL",
    "test@test-project.iam.gserviceaccount.com",
  );
  vi.stubEnv("FIREBASE_PRIVATE_KEY", key);
}

it("rejects a private key ID with a safe, actionable diagnostic", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  configure("a".repeat(40));
  expect(adminCredentials).toThrow(
    "Server authentication is not configured correctly",
  );
  expect(log.mock.calls[0][1]).toContain("not private_key_id");
  expect(JSON.stringify(log.mock.calls)).not.toContain("a".repeat(40));
});

it("rejects missing credentials", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  configure("");
  expect(adminCredentials).toThrow(
    "Server authentication is not configured correctly",
  );
});

it("accepts a complete RSA PEM with real or escaped newlines", () => {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  for (const value of [privateKey, privateKey.replace(/\n/g, "\\n")]) {
    configure(value);
    expect(adminCredentials().privateKey).toBe(privateKey.trim());
  }
});
