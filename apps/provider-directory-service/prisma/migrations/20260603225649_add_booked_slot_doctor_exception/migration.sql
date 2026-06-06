-- Migration: add_booked_slot_doctor_exception
-- CreateTable: booked_slots (async replica from booking-service via RabbitMQ)
-- CreateTable: doctor_exceptions (doctor-level schedule blocks)

CREATE TABLE "booked_slots" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "doctor_id" VARCHAR(27) NOT NULL,
    "slot_date" DATE NOT NULL,
    "time_start" VARCHAR(5) NOT NULL,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booked_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctor_exceptions" (
    "id" TEXT NOT NULL,
    "doctor_id" VARCHAR(27) NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "is_full_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booked_slots_appointment_id_key" ON "booked_slots"("appointment_id");
CREATE INDEX "idx_booked_slots_doctor_date" ON "booked_slots"("doctor_id", "slot_date");
CREATE INDEX "idx_doctor_exceptions_doctor_date" ON "doctor_exceptions"("doctor_id", "date");
