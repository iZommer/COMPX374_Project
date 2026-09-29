import express from "express";
import type { AvailabilityStatus, DiaryPayload } from "../shared/payload.js";

const app = express();
app.use(express.json());
let mode: "normal" | "empty-calendar" | "no-contact" | "slow" | "error" = "normal";
let status: AvailabilityStatus = "AVAILABLE";

function mondayStart(): Date {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1, 0));
}

function payload(): DiaryPayload {
  const weekStart = mondayStart();
  const at = (day: number, hour: number, minute = 0) =>
    new Date(weekStart.getTime() + day * 86_400_000 + hour * 3_600_000 + minute * 60_000).toISOString();
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    timezone: "Pacific/Auckland",
    week: { start: weekStart.toISOString(), end: at(7, 0) },
    academic: { name: "Dr Aroha Example" },
    availability: {
      status,
      expectedReturnTime: status === "IN_A_MEETING" ? new Date(Date.now() + 45 * 60_000).toISOString() : null,
      customMessage: status === "TEACHING" ? "Teaching in G.1.15" : "Feel free to knock.",
      updatedAt: new Date().toISOString(),
    },
    calendar: mode === "empty-calendar" ? [] : [
      { title: "COMPX374 Lecture", startTime: at(0, 10), endTime: at(0, 12), source: "ICS_IMPORT" },
      { title: "Research meeting", startTime: at(1, 13), endTime: at(1, 14, 30), source: "MANUAL" },
      { title: "Student consultation", startTime: at(1, 13, 30), endTime: at(1, 15), source: "MANUAL" },
      { title: "Conference travel", startTime: at(3, 16), endTime: at(4, 10), source: "ICS_IMPORT" },
    ],
    contact: mode === "no-contact" ? null : {
      email: "aroha@example.ac.nz",
      phone: "+64 7 838 0000",
      officeLocation: "G.2.21, Gate 8, Hillcrest Road",
    },
  };
}

app.get("/api/display/:apiKey/latest", async (request, response) => {
  if (request.params.apiKey !== "test-key") return response.status(404).json({ error: "Display key not found." });
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 12_000));
  if (mode === "error") return response.status(503).json({ error: "Simulated outage" });
  return response.json(payload());
});

app.post("/mock/status/:status", (request, response) => {
  if (!(["AVAILABLE", "IN_A_MEETING", "TEACHING", "OUT_OF_OFFICE"] as string[]).includes(request.params.status))
    return response.status(400).json({ error: "Unknown status" });
  status = request.params.status as AvailabilityStatus;
  return response.json({ status });
});

app.post("/mock/mode/:mode", (request, response) => {
  if (!(["normal", "empty-calendar", "no-contact", "slow", "error"] as string[]).includes(request.params.mode))
    return response.status(400).json({ error: "Unknown mode" });
  mode = request.params.mode as typeof mode;
  return response.json({ mode });
});

app.get("/mock", (_request, response) => response.json({
  endpoint: "http://127.0.0.1:4100/api/display/test-key/latest",
  mode,
  status,
  controls: {
    status: "POST /mock/status/AVAILABLE|IN_A_MEETING|TEACHING|OUT_OF_OFFICE",
    mode: "POST /mock/mode/normal|empty-calendar|no-contact|slow|error",
    invalidKey: "Use any key other than test-key",
  },
}));

app.listen(4100, "127.0.0.1", () =>
  console.log("Mock Diary Server: http://127.0.0.1:4100 (key: test-key)"),
);
