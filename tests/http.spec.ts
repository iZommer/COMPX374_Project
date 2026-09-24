import { expect, it, vi } from "vitest";
import { route } from "../lib/http";

it("logs a safe Prisma error code without exposing database details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const handler = route(async () => {
      throw Object.assign(
        new Error("postgresql://private-secret and event contents"),
        {
          name: "PrismaClientKnownRequestError",
          code: "P2022",
        },
      );
    }, "calendar-import");
    const response = await handler(
      new Request("https://example.org/api/calendar/import"),
    );
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[diary-api] Request failed", {
      operation: "calendar-import",
      errorType: "PrismaClientKnownRequestError",
      code: "P2022",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-secret");
    expect(await response.text()).not.toContain("private-secret");
  } finally {
    log.mockRestore();
  }
});
