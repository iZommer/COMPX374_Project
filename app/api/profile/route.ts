import { academicFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route } from "@/lib/http";
import { profileInput } from "@/lib/validation";

export const GET = route(async (req) => {
  const academic = await academicFor(req);
  return json({ name: academic.name });
});

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
