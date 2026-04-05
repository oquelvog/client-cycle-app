-- Annua schema — paste this into the Neon SQL Editor if prisma db push fails
-- Safe to run on an empty database

CREATE TYPE "DurationType" AS ENUM ('specific_date', 'month', 'quarter');
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'completed');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReviewCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "ReviewCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dayOfYear" INTEGER NOT NULL,
    "endDayOfYear" INTEGER NOT NULL,
    "durationType" "DurationType" NOT NULL DEFAULT 'specific_date',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "reviewCycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dayOfYear" INTEGER NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "checkInId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "lastContacted" TIMESTAMP(3),
    "cycleYear" INTEGER NOT NULL DEFAULT 2025,
    "reviewCycleId" TEXT NOT NULL,
    "currentMilestoneId" TEXT,
    "advisorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientTask" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "ClientTask_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClientTask_clientId_taskId_key" UNIQUE ("clientId", "taskId")
);

CREATE TABLE "ClientCheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT "ClientCheckIn_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClientCheckIn_clientId_checkInId_key" UNIQUE ("clientId", "checkInId")
);

ALTER TABLE "ReviewCycle"  ADD CONSTRAINT "ReviewCycle_advisorId_fkey"       FOREIGN KEY ("advisorId")        REFERENCES "User"("id")        ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Milestone"    ADD CONSTRAINT "Milestone_reviewCycleId_fkey"     FOREIGN KEY ("reviewCycleId")    REFERENCES "ReviewCycle"("id") ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "CheckIn"      ADD CONSTRAINT "CheckIn_milestoneId_fkey"         FOREIGN KEY ("milestoneId")      REFERENCES "Milestone"("id")   ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Task"         ADD CONSTRAINT "Task_checkInId_fkey"              FOREIGN KEY ("checkInId")        REFERENCES "CheckIn"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Client"       ADD CONSTRAINT "Client_reviewCycleId_fkey"        FOREIGN KEY ("reviewCycleId")    REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Client"       ADD CONSTRAINT "Client_currentMilestoneId_fkey"   FOREIGN KEY ("currentMilestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client"       ADD CONSTRAINT "Client_advisorId_fkey"            FOREIGN KEY ("advisorId")        REFERENCES "User"("id")        ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "ClientTask"   ADD CONSTRAINT "ClientTask_clientId_fkey"         FOREIGN KEY ("clientId")         REFERENCES "Client"("id")      ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "ClientTask"   ADD CONSTRAINT "ClientTask_taskId_fkey"           FOREIGN KEY ("taskId")           REFERENCES "Task"("id")        ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "ClientCheckIn" ADD CONSTRAINT "ClientCheckIn_clientId_fkey"     FOREIGN KEY ("clientId")         REFERENCES "Client"("id")      ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "ClientCheckIn" ADD CONSTRAINT "ClientCheckIn_checkInId_fkey"    FOREIGN KEY ("checkInId")        REFERENCES "CheckIn"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;

-- Prisma migration tracking (required so Prisma doesn't re-push)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);
