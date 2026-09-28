import { expect, it } from "vitest";
import { getStaleness } from "../shared/state.js";

it("distinguishes fresh, temporarily offline, and significantly stale data", () => {
  const now = Date.parse("2026-09-28T12:00:00Z");
  expect(getStaleness("2026-09-28T11:00:00Z", true, 24, now)).toBe("fresh");
  expect(getStaleness("2026-09-28T11:00:00Z", false, 24, now)).toBe("outdated");
  expect(getStaleness("2026-09-27T11:00:00Z", false, 24, now)).toBe("stale");
  expect(getStaleness(null, false, 24, now)).toBe("outdated");
});
