/** Authenticated API for the academic's display name. */
import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { profileInput } from "@/lib/validation";

/** Returns the signed-in academic's current name. */
export const GET = route(async (req) => {
  const academic = await academicFor(req);
  return json({ name: academic.name });
});

/** Validates and saves the signed-in academic's name. */
export const PUT = route(async (req) => {
  const academic = await academicFor(req);
  const data = profileInput.parse(await body(req));
  return json(
    await db.academic.update({
      where: { id: academic.id },
      data: { name: data.name },
      select: { name: true },
    }),
  );
});
