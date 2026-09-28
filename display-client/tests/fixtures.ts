import type { DiaryPayload } from "../shared/payload.js";

export const validPayload: DiaryPayload = {
  schemaVersion: 1,
  generatedAt: "2026-09-28T00:00:00.000Z",
  timezone: "Pacific/Auckland",
  week: { start: "2026-09-27T11:00:00.000Z", end: "2026-10-04T11:00:00.000Z" },
  academic: { name: "Test Academic" },
  availability: { status: "AVAILABLE", updatedAt: "2026-09-28T00:00:00.000Z" },
  calendar: [],
  contact: { email: "test@example.test", phone: "123", officeLocation: "G.1.01" },
};
