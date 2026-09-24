import { z } from "zod";
export const availabilityInput = z
  .object({
    status: z.enum(["AVAILABLE", "IN_A_MEETING", "TEACHING", "OUT_OF_OFFICE"]),
    expectedReturnTime: z.string().datetime({ offset: true }).nullable(),
    customMessage: z.string().trim().max(200).nullable(),
  })
  .strict();
export const contactInput = z
  .object({
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(50),
    officeLocation: z.string().trim().max(120),
  })
  .strict();
export const eventInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
  })
  .strict()
  .refine((e) => new Date(e.endTime) > new Date(e.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });
