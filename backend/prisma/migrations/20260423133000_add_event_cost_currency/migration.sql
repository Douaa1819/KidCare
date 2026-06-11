-- Add billing fields to events
ALTER TABLE "Event"
ADD COLUMN "cost" DECIMAL(12, 2),
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MAD';
