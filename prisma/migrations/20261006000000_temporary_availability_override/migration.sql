ALTER TABLE "AvailabilityStatus"
ADD COLUMN "overrideStatus" "Status",
ADD COLUMN "overrideUntil" TIMESTAMP(3),
ADD COLUMN "overrideMessage" TEXT;
