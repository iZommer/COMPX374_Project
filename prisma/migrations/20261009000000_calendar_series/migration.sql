ALTER TABLE "CalendarEvent" ADD COLUMN "recurrenceRule" TEXT;
CREATE TABLE "CalendarEventException" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "occurrenceStart" TIMESTAMP(3) NOT NULL,
  "cancelled" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT,
  "startTime" TIMESTAMP(3),
  "endTime" TIMESTAMP(3),
  "status" "Status",
  CONSTRAINT "CalendarEventException_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarEventException_eventId_occurrenceStart_key" ON "CalendarEventException"("eventId", "occurrenceStart");
