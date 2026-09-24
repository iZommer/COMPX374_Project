import { academicFor, newKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
export const GET = route(async (req) => {
  const a = await academicFor(req);
  return json(
    await db.displayAssociation.findUnique({
      where: { academicId: a.id },
      select: { apiKey: true, pairedAt: true },
    }),
  );
});
export const POST = route(async (req) => {
  const a = await academicFor(req);
  return json(
    await db.displayAssociation.update({
      where: { academicId: a.id },
      data: { apiKey: newKey(), pairedAt: null },
      select: { apiKey: true, pairedAt: true },
    }),
  );
});
