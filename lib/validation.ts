import { z } from "zod";
export const availabilityInput = z
  .object({
    status: z
      .enum(["AVAILABLE", "IN_A_MEETING", "TEACHING", "OUT_OF_OFFICE"])
      .default("IN_A_MEETING"),
    expectedReturnTime: z.string().datetime({ offset: true }).nullable(),
    customMessage: z.string().trim().max(200).nullable(),
    overrideStatus: z
      .enum(["AVAILABLE", "IN_A_MEETING", "TEACHING", "OUT_OF_OFFICE"])
      .nullable()
      .default(null),
    overrideUntil: z.string().datetime({ offset: true }).nullable().default(null),
    overrideMessage: z.string().trim().max(200).nullable().default(null),
  })
  .strict()
  .refine((value) => !value.overrideStatus || Boolean(value.overrideUntil), {
    message: "Choose an expiry time for the force status.",
    path: ["overrideUntil"],
  });
export const contactInput = z
  .object({
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(50),
    officeLocation: z.string().trim().max(120),
  })
  .strict();
export const profileInput = z
  .object({ name: z.string().trim().min(1).max(120) })
  .strict();
export const eventInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    startTime: z.string().datetime({ offset: true }),
    endTime: z.string().datetime({ offset: true }),
    status: z.enum(["AVAILABLE", "IN_A_MEETING", "TEACHING", "OUT_OF_OFFICE"]),
  })
  .strict()
  .refine((e) => new Date(e.endTime) > new Date(e.startTime), {
    message: "End time must be after start time.",
    path: ["endTime"],
  });
