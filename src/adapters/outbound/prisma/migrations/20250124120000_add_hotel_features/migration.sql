-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SERVICE', 'HOTEL', 'CINEMA');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "BookingStatus" ADD VALUE 'CHECKED_OUT';
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- AlterTable
ALTER TABLE "services" ADD COLUMN "type" "ServiceType" NOT NULL DEFAULT 'SERVICE';

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER,
    "description" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "check_in_date" DATE,
ADD COLUMN "check_out_date" DATE,
ADD COLUMN "room_id" TEXT,
ADD COLUMN "number_of_nights" INTEGER,
ADD COLUMN "guest_name" TEXT,
ADD COLUMN "guest_email" TEXT,
ADD COLUMN "guest_document" TEXT;

-- CreateIndex
CREATE INDEX "services_type_idx" ON "services"("type");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_service_id_number_key" ON "rooms"("service_id", "number");

-- CreateIndex
CREATE INDEX "rooms_service_id_idx" ON "rooms"("service_id");

-- CreateIndex
CREATE INDEX "rooms_status_idx" ON "rooms"("status");

-- CreateIndex
CREATE INDEX "bookings_room_id_idx" ON "bookings"("room_id");

-- CreateIndex
CREATE INDEX "bookings_check_in_date_idx" ON "bookings"("check_in_date");

-- CreateIndex
CREATE INDEX "bookings_check_out_date_idx" ON "bookings"("check_out_date");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

