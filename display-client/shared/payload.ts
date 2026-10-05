export const availabilityStatuses = [
  "AVAILABLE",
  "IN_A_MEETING",
  "TEACHING",
  "OUT_OF_OFFICE",
] as const;

export type AvailabilityStatus = (typeof availabilityStatuses)[number];

export interface Availability {
  status: AvailabilityStatus;
  expectedReturnTime?: string | null;
  customMessage?: string | null;
  updatedAt: string;
}

export interface CalendarEvent {
  title: string;
  startTime: string;
  endTime: string;
  status?: AvailabilityStatus;
  source?: string;
}

export interface ContactInfo {
  email?: string | null;
  phone?: string | null;
  officeLocation?: string | null;
}

export interface DiaryPayload {
  schemaVersion?: number;
  generatedAt: string;
  timezone?: string;
  week?: { start: string; end: string };
  academic: { name: string };
  availability?: Availability | null;
  calendar: CalendarEvent[];
  contact?: ContactInfo | null;
  displaySettings?: {
    timezone: string;
    textScale: "normal" | "large" | "largest";
    highContrast: boolean;
    pixelShiftEnabled: boolean;
    idleReturnSeconds: number;
    staleAfterHours: number;
    dimStartHour: number | null;
    dimEndHour: number | null;
    dimLevel: number;
    timeFormat24h: boolean;
  };
}

export type ValidationResult =
  | { ok: true; value: DiaryPayload }
  | { ok: false; error: string };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDate = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

const optionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";

export function validateDiaryPayload(input: unknown): ValidationResult {
  if (!isObject(input)) return { ok: false, error: "Response must be an object." };
  if (!isDate(input.generatedAt))
    return { ok: false, error: "generatedAt must be an ISO timestamp." };
  if (!isObject(input.academic) || typeof input.academic.name !== "string")
    return { ok: false, error: "academic.name is required." };

  if (input.availability !== undefined && input.availability !== null) {
    if (!isObject(input.availability))
      return { ok: false, error: "availability must be an object." };
    if (
      typeof input.availability.status !== "string" ||
      !availabilityStatuses.includes(input.availability.status as AvailabilityStatus)
    )
      return { ok: false, error: "availability.status is invalid." };
    if (!isDate(input.availability.updatedAt))
      return { ok: false, error: "availability.updatedAt is invalid." };
    if (
      !optionalString(input.availability.expectedReturnTime) ||
      (typeof input.availability.expectedReturnTime === "string" &&
        !isDate(input.availability.expectedReturnTime))
    )
      return { ok: false, error: "expectedReturnTime is invalid." };
    if (!optionalString(input.availability.customMessage))
      return { ok: false, error: "customMessage is invalid." };
  }

  if (!Array.isArray(input.calendar))
    return { ok: false, error: "calendar must be an array." };
  for (const event of input.calendar) {
    if (
      !isObject(event) ||
      typeof event.title !== "string" ||
      !isDate(event.startTime) ||
      !isDate(event.endTime) ||
      (event.status !== undefined &&
        (typeof event.status !== "string" ||
          !availabilityStatuses.includes(event.status as AvailabilityStatus))) ||
      Date.parse(event.endTime) <= Date.parse(event.startTime)
    )
      return { ok: false, error: "A calendar event is malformed." };
  }

  if (input.contact !== undefined && input.contact !== null) {
    if (!isObject(input.contact))
      return { ok: false, error: "contact must be an object." };
    if (
      !optionalString(input.contact.email) ||
      !optionalString(input.contact.phone) ||
      !optionalString(input.contact.officeLocation)
    )
      return { ok: false, error: "contact fields must be strings." };
  }
  if (input.displaySettings !== undefined) {
    const settings = input.displaySettings;
    if (!isObject(settings) || typeof settings.timezone !== "string" || !["normal", "large", "largest"].includes(String(settings.textScale)) || typeof settings.highContrast !== "boolean" || typeof settings.pixelShiftEnabled !== "boolean" || typeof settings.timeFormat24h !== "boolean" || !Number.isInteger(settings.idleReturnSeconds) || Number(settings.idleReturnSeconds) < 10 || Number(settings.idleReturnSeconds) > 3600 || !Number.isInteger(settings.staleAfterHours) || Number(settings.staleAfterHours) < 1 || Number(settings.staleAfterHours) > 720 || !(settings.dimStartHour === null || (Number.isInteger(settings.dimStartHour) && Number(settings.dimStartHour) >= 0 && Number(settings.dimStartHour) <= 23)) || !(settings.dimEndHour === null || (Number.isInteger(settings.dimEndHour) && Number(settings.dimEndHour) >= 0 && Number(settings.dimEndHour) <= 23)) || !Number.isInteger(settings.dimLevel) || Number(settings.dimLevel) < 10 || Number(settings.dimLevel) > 100)
      return { ok: false, error: "displaySettings is invalid." };
  }
  if (input.week !== undefined) {
    if (!isObject(input.week) || !isDate(input.week.start) || !isDate(input.week.end))
      return { ok: false, error: "week range is malformed." };
  }
  return { ok: true, value: input as unknown as DiaryPayload };
}
