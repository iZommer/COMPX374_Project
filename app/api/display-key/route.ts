/** Authenticated API for retrieving or rotating the kiosk's bearer key. */
import { academicFor, newKey } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
/** Returns the signed-in academic's display key and pairing timestamp. */
export const GET = route(async (req) => {
  const a = await academicFor(req);
  return json(
    await db.displayAssociation.findUnique({
      where: { academicId: a.id },
      select: { apiKey: true, pairedAt: true },
    }),
  );
});
/** Rotates the key and clears the pairing timestamp, invalidating the old Pi key. */
export const POST = route(async (req) => {
  const a = await academicFor(req);
  return json(
    await db.displayAssociation.update({
      where: { academicId: a.id },
      // Rotation invalidates the old Pi credential and clears its pairing timestamp.
      data: { apiKey: newKey(), pairedAt: null },
      select: { apiKey: true, pairedAt: true },
    }),
  );
});
