-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AVAILABLE', 'IN_A_MEETING', 'TEACHING', 'OUT_OF_OFFICE');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('MANUAL', 'ICS_IMPORT');

-- CreateTable
CREATE TABLE "Academic" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Academic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityStatus" (
    "academicId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'OUT_OF_OFFICE',
    "expectedReturnTime" TIMESTAMP(3),
    "customMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityStatus_pkey" PRIMARY KEY ("academicId")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "academicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "source" "EventSource" NOT NULL DEFAULT 'MANUAL',
    "importKey" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInfo" (
    "academicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "officeLocation" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ContactInfo_pkey" PRIMARY KEY ("academicId")
);

-- CreateTable
CREATE TABLE "DisplayAssociation" (
    "id" TEXT NOT NULL,
    "academicId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "pairedAt" TIMESTAMP(3),

    CONSTRAINT "DisplayAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Academic_firebaseUid_key" ON "Academic"("firebaseUid");

-- CreateIndex
CREATE INDEX "CalendarEvent_academicId_startTime_endTime_idx" ON "CalendarEvent"("academicId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_academicId_importKey_key" ON "CalendarEvent"("academicId", "importKey");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayAssociation_academicId_key" ON "DisplayAssociation"("academicId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayAssociation_apiKey_key" ON "DisplayAssociation"("apiKey");

-- AddForeignKey
ALTER TABLE "AvailabilityStatus" ADD CONSTRAINT "AvailabilityStatus_academicId_fkey" FOREIGN KEY ("academicId") REFERENCES "Academic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_academicId_fkey" FOREIGN KEY ("academicId") REFERENCES "Academic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInfo" ADD CONSTRAINT "ContactInfo_academicId_fkey" FOREIGN KEY ("academicId") REFERENCES "Academic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayAssociation" ADD CONSTRAINT "DisplayAssociation_academicId_fkey" FOREIGN KEY ("academicId") REFERENCES "Academic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
