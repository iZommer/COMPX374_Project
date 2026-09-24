import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { availabilityInput } from "@/lib/validation";
export const GET = route(async (req) => {
  const a = await academicFor(req);
  return json(
    await db.availabilityStatus.findUnique({ where: { academicId: a.id } }),
  );
});
export const PUT = route(async (req) => {
  const a = await academicFor(req);
  const data = availabilityInput.parse(await body(req));
  return json(
    await db.availabilityStatus.update({ where: { academicId: a.id }, data }),
  );
});
