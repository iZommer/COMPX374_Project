CREATE TABLE "DisplayClientSettings" (
  "academicId" TEXT NOT NULL,
  "textScale" TEXT NOT NULL DEFAULT 'normal',
  "highContrast" BOOLEAN NOT NULL DEFAULT false,
  "pixelShiftEnabled" BOOLEAN NOT NULL DEFAULT true,
  "idleReturnSeconds" INTEGER NOT NULL DEFAULT 60,
  "staleAfterHours" INTEGER NOT NULL DEFAULT 24,
  "dimStartHour" INTEGER NOT NULL DEFAULT 19,
  "dimEndHour" INTEGER NOT NULL DEFAULT 7,
  "dimLevel" INTEGER NOT NULL DEFAULT 55,
  "timeFormat24h" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayClientSettings_pkey" PRIMARY KEY ("academicId"),
  CONSTRAINT "DisplayClientSettings_academicId_fkey" FOREIGN KEY ("academicId") REFERENCES "Academic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
