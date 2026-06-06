-- Migration: add_outbox_appointment_centric
-- Adds OutboxEvent table, backfills slot fields on Appointment,
-- and applies the zero-collision unique constraint (Appointment-centric pattern)

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- AlterTable: add slot fields and make eventId optional
ALTER TABLE "appointments"
  ADD COLUMN "service_date" DATE,
  ADD COLUMN "time_start"   VARCHAR(5),
  ADD COLUMN "time_end"     VARCHAR(5),
  ALTER COLUMN "event_id" DROP NOT NULL;

-- Backfill slot data from the events table into appointments
UPDATE "appointments" a
SET
  "service_date" = e."service_date",
  "time_start"   = TO_CHAR(e."time_start", 'HH24:MI'),
  "time_end"     = TO_CHAR(e."time_end",   'HH24:MI')
FROM "events" e
WHERE a."event_id" = e."id"
  AND e."service_date" IS NOT NULL
  AND e."time_start"   IS NOT NULL
  AND e."time_end"     IS NOT NULL;

-- CreateTable: outbox_events
CREATE TABLE "outbox_events" (
    "id"             TEXT NOT NULL,
    "type"           VARCHAR(100) NOT NULL,
    "payload"        JSONB NOT NULL,
    "status"         "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "correlation_id" VARCHAR(36),
    "processed_at"   TIMESTAMPTZ(6),
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on outbox_events
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex on appointments for reporting queries
CREATE INDEX "idx_appointments_service_date" ON "appointments"("service_date");
CREATE INDEX "idx_appointments_doctor_date"  ON "appointments"("doctor_id", "service_date");

-- Unique constraint: zero-collision (one booking per doctor per slot)
-- NOTE: Only applied to rows where service_date is populated (all backfilled rows)
CREATE UNIQUE INDEX "uq_appointments_doctor_slot"
  ON "appointments"("doctor_id", "service_date", "time_start")
  WHERE "service_date" IS NOT NULL AND "time_start" IS NOT NULL;
