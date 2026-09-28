import { expect, it } from "vitest";
import { createVCard, hasContactDetails } from "../shared/vcard.js";

it("creates a vCard 3.0 with escaped contact values", () => {
  const card = createVCard("Aroha, Example", {
    email: "aroha@example.test",
    phone: "+64 7 123 456",
    officeLocation: "G.1.01; Main Building",
  });
  expect(card).toContain("BEGIN:VCARD\r\nVERSION:3.0");
  expect(card).toContain("FN:Aroha\\, Example");
  expect(card).toContain("ADR:;;G.1.01\\; Main Building;;;;");
  expect(card.endsWith("END:VCARD\r\n")).toBe(true);
});

it("detects an entirely empty contact", () => {
  expect(hasContactDetails({ email: "", phone: " ", officeLocation: null })).toBe(false);
  expect(hasContactDetails({ email: "person@example.test" })).toBe(true);
});
