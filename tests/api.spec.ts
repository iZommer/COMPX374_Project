import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  academic: { findUnique: vi.fn(), create: vi.fn() },
  availabilityStatus: { findUnique: vi.fn(), update: vi.fn() },
  contactInfo: { findUnique: vi.fn(), update: vi.fn() },
  calendarEvent: { findMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
  displayAssociation: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}));
vi.mock("@/lib/db", () => ({ db: mocks }));
import * as availability from "@/app/api/availability/route";
import * as contact from "@/app/api/contact/route";
import * as calendar from "@/app/api/calendar/route";
import * as displayKey from "@/app/api/display-key/route";
import * as imported from "@/app/api/calendar/import/route";
import { GET as latest } from "@/app/api/display/[apiKey]/latest/route";
function request(
  path: string,
  method = "GET",
  body?: unknown,
  token = "valid",
) {
  return new Request(`http://localhost/api/${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verifyIdToken.mockResolvedValue({
    uid: "firebase-a",
    email: "a@example.org",
    firebase: { sign_in_provider: "password" },
  });
  mocks.academic.findUnique.mockResolvedValue({ id: "academic-a" });
});
describe("authorization boundary", () => {
  const protectedRoutes = [
    ["availability", "GET", availability.GET],
    ["availability", "PUT", availability.PUT],
    ["contact", "GET", contact.GET],
    ["contact", "PUT", contact.PUT],
    ["calendar", "GET", calendar.GET],
    ["calendar", "POST", calendar.POST],
    ["calendar/import", "POST", imported.POST],
    ["display-key", "GET", displayKey.GET],
    ["display-key", "POST", displayKey.POST],
  ] as const;
  for (const [path, method, handler] of protectedRoutes)
    it(`${method} ${path} rejects missing and invalid credentials before database access`, async () => {
      expect((await handler(request(path, method, undefined, ""))).status).toBe(
        401,
      );
      mocks.verifyIdToken.mockRejectedValue(
        Object.assign(new Error("revoked"), { code: "auth/id-token-revoked" }),
      );
      expect((await handler(request(path, method))).status).toBe(401);
      expect(mocks.academic.findUnique).not.toHaveBeenCalled();
    });
  it("rejects non-password providers", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      uid: "x",
      email: "x@example.org",
      firebase: { sign_in_provider: "google.com" },
    });
    expect((await contact.GET(request("contact"))).status).toBe(403);
    expect(mocks.academic.findUnique).not.toHaveBeenCalled();
  });
  it("does not mislabel server credential rejection as an expired session", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.verifyIdToken.mockRejectedValue(
        Object.assign(new Error("private error details"), { code: 400 }),
      );
      const response = await contact.GET(request("contact"));
      expect(response.status).toBe(503);
      expect((await response.json()).error).not.toContain("expired");
      expect(mocks.academic.findUnique).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "private error details",
      );
    } finally {
      log.mockRestore();
    }
  });
  it("reports actual token expiry as a 401", async () => {
    mocks.verifyIdToken.mockRejectedValue({ code: "auth/id-token-expired" });
    const response = await contact.GET(request("contact"));
    expect(response.status).toBe(401);
    expect((await response.json()).error).toContain("expired");
  });
  it("scopes reads to the verified academic and enables revocation checking", async () => {
    mocks.contactInfo.findUnique.mockResolvedValue({ email: "a@example.org" });
    await contact.GET(request("contact?academicId=academic-b"));
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("valid", true);
    expect(mocks.academic.findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: "firebase-a" },
    });
    expect(mocks.contactInfo.findUnique).toHaveBeenCalledWith({
      where: { academicId: "academic-a" },
    });
  });
  it("rejects ownership injection and scopes valid writes", async () => {
    const data = {
      email: "new@example.org",
      phone: "",
      officeLocation: "G.2.15",
    };
    expect(
      (
        await contact.PUT(
          request("contact", "PUT", { ...data, academicId: "academic-b" }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.contactInfo.update).not.toHaveBeenCalled();
    mocks.contactInfo.update.mockResolvedValue(data);
    expect((await contact.PUT(request("contact", "PUT", data))).status).toBe(
      200,
    );
    expect(mocks.contactInfo.update).toHaveBeenCalledWith({
      where: { academicId: "academic-a" },
      data,
    });
  });
  it("scopes calendar reads, manual creates, and availability writes", async () => {
    mocks.calendarEvent.findMany.mockResolvedValue([]);
    await calendar.GET(request("calendar?week=2026-09-21"));
    expect(mocks.calendarEvent.findMany.mock.calls[0][0].where.academicId).toBe(
      "academic-a",
    );
    mocks.calendarEvent.create.mockResolvedValue({ id: "event" });
    await calendar.POST(
      request("calendar", "POST", {
        title: "Meeting",
        startTime: "2026-09-24T00:00:00Z",
        endTime: "2026-09-24T01:00:00Z",
      }),
    );
    expect(mocks.calendarEvent.create.mock.calls[0][0].data.academicId).toBe(
      "academic-a",
    );
    mocks.availabilityStatus.update.mockResolvedValue({ status: "AVAILABLE" });
    await availability.PUT(
      request("availability", "PUT", {
        status: "AVAILABLE",
        expectedReturnTime: null,
        customMessage: null,
      }),
    );
    expect(
      mocks.availabilityStatus.update.mock.calls[0][0].where.academicId,
    ).toBe("academic-a");
  });
  it("rotates only the owner key with fresh 256-bit randomness", async () => {
    mocks.displayAssociation.update.mockResolvedValue({
      apiKey: "key",
      pairedAt: null,
    });
    await displayKey.POST(request("display-key", "POST"));
    const args = mocks.displayAssociation.update.mock.calls[0][0];
    expect(args.where).toEqual({ academicId: "academic-a" });
    expect(args.data.apiKey).toMatch(/^[a-f0-9]{64}$/);
    expect(args.data.pairedAt).toBeNull();
  });
  it("provisions related records in one create without storing passwords", async () => {
    mocks.academic.findUnique.mockResolvedValue(null);
    mocks.academic.create.mockResolvedValue({ id: "new" });
    mocks.contactInfo.findUnique.mockResolvedValue({});
    await contact.GET(request("contact"));
    const data = mocks.academic.create.mock.calls[0][0].data;
    expect(data.firebaseUid).toBe("firebase-a");
    expect(data.availability.create).toEqual({});
    expect(data.contact.create.email).toBe("a@example.org");
    expect(data.display.create.apiKey).toMatch(/^[a-f0-9]{64}$/);
    expect(data).not.toHaveProperty("password");
  });
});
describe("display contract", () => {
  it("returns 404 for malformed and revoked keys without a Firebase session", async () => {
    expect(
      (
        await latest(request("display/bad/latest"), {
          params: Promise.resolve({ apiKey: "bad" }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.displayAssociation.findUnique).not.toHaveBeenCalled();
    mocks.displayAssociation.findUnique.mockResolvedValue(null);
    expect(
      (
        await latest(request("display/key/latest"), {
          params: Promise.resolve({ apiKey: "a".repeat(64) }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
  it("returns only visitor fields and disables caching", async () => {
    mocks.displayAssociation.findUnique.mockResolvedValue({
      academic: {
        name: "Nic",
        availability: { status: "AVAILABLE" },
        events: [],
        contact: { email: "visitor@example.org" },
        firebaseUid: "private",
        email: "login@example.org",
      },
    });
    const response = await latest(request("display/key/latest"), {
      params: Promise.resolve({ apiKey: "b".repeat(64) }),
    });
    const data = await response.json();
    expect(data.academic).toEqual({ name: "Nic" });
    expect(data.schemaVersion).toBe(1);
    expect(JSON.stringify(data)).not.toContain("private");
    expect(JSON.stringify(data)).not.toContain("login@example.org");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
});
