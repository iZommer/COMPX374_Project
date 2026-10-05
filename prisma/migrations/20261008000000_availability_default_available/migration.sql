ALTER TABLE "AvailabilityStatus" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
UPDATE "AvailabilityStatus" SET "status" = 'AVAILABLE' WHERE "status" <> 'AVAILABLE';
