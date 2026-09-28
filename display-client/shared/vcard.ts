import type { ContactInfo } from "./payload.js";

const escapeValue = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

export function hasContactDetails(contact?: ContactInfo | null): boolean {
  return Boolean(contact?.email?.trim() || contact?.phone?.trim() || contact?.officeLocation?.trim());
}

export function createVCard(name: string, contact: ContactInfo): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeValue(name)}`];
  if (contact.email?.trim()) lines.push(`EMAIL:${escapeValue(contact.email.trim())}`);
  if (contact.phone?.trim()) lines.push(`TEL:${escapeValue(contact.phone.trim())}`);
  if (contact.officeLocation?.trim())
    lines.push(`ADR:;;${escapeValue(contact.officeLocation.trim())};;;;`);
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}
