/** Authenticated read/write API for visitor-facing contact details. */
import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { contactInput } from "@/lib/validation";
/** Returns contact details owned by the signed-in academic. */
export const GET = route(async (req) => {
  const a = await academicFor(req);
  return json(await db.contactInfo.findUnique({ where: { academicId: a.id } }));
});
/** Validates and saves visitor contact fields. */
export const PUT = route(async (req) => {
  const a = await academicFor(req);
  const data = contactInput.parse(await body(req));
  return json(
    await db.contactInfo.update({ where: { academicId: a.id }, data }),
  );
});
