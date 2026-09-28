import { describe, expect, it } from "vitest";
import { validateDiaryPayload } from "../shared/payload.js";
import { validPayload } from "./fixtures.js";

describe("Diary payload validation", () => {
  it("accepts the real endpoint shape and absent optional objects", () => {
    expect(validateDiaryPayload(validPayload).ok).toBe(true);
    expect(validateDiaryPayload({ ...validPayload, availability: null, contact: null }).ok).toBe(true);
  });

  it("rejects unknown statuses and malformed events", () => {
    expect(validateDiaryPayload({ ...validPayload, availability: { status: "BUSY", updatedAt: validPayload.generatedAt } }).ok).toBe(false);
    expect(validateDiaryPayload({ ...validPayload, calendar: [{ title: "Bad", startTime: "x", endTime: "y" }] }).ok).toBe(false);
  });
});
