import { describe, expect, it } from "vitest";
import { isDimmingHour } from "../shared/state.js";

describe("brightness schedule", () => {
  it("handles schedules that cross midnight", () => {
    expect(isDimmingHour(18, 19, 7)).toBe(false);
    expect(isDimmingHour(19, 19, 7)).toBe(true);
    expect(isDimmingHour(23, 19, 7)).toBe(true);
    expect(isDimmingHour(6, 19, 7)).toBe(true);
    expect(isDimmingHour(7, 19, 7)).toBe(false);
  });
});
