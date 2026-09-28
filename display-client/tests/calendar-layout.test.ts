import { describe, expect, it } from "vitest";
import { layoutWeekEvents } from "../shared/calendar-layout.js";

describe("weekly calendar layout", () => {
  const zone = "Pacific/Auckland";
  const week = "2026-09-20T12:00:00.000Z";

  it("assigns overlapping events to separate columns", () => {
    const result = layoutWeekEvents([
      { title: "A", startTime: "2026-09-21T00:00:00.000Z", endTime: "2026-09-21T02:00:00.000Z" },
      { title: "B", startTime: "2026-09-21T01:00:00.000Z", endTime: "2026-09-21T03:00:00.000Z" },
    ], week, zone);
    expect(result).toHaveLength(2);
    expect(new Set(result.map((item) => item.column)).size).toBe(2);
    expect(result.every((item) => item.columnCount === 2)).toBe(true);
  });

  it("splits events spanning local midnight", () => {
    const result = layoutWeekEvents([
      { title: "Overnight", startTime: "2026-09-22T11:00:00.000Z", endTime: "2026-09-22T14:00:00.000Z" },
    ], week, zone);
    expect(result).toHaveLength(2);
    expect(result[0].continuesAfter).toBe(true);
    expect(result[1].continuesBefore).toBe(true);
  });

  it("uses local wall-clock minutes across the NZ DST transition", () => {
    const result = layoutWeekEvents([
      { title: "DST", startTime: "2026-09-26T13:30:00.000Z", endTime: "2026-09-26T15:30:00.000Z" },
    ], week, zone);
    expect(result[0].startMinute).toBe(90);
    expect(result[0].endMinute).toBe(270);
  });
});
