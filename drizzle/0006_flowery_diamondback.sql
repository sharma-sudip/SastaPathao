CREATE TYPE "public"."offer_by" AS ENUM('claimant', 'author');--> statement-breakpoint
ALTER TABLE "claim" ADD COLUMN "offer_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "claim" ADD COLUMN "offer_by" "offer_by";--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "asking_price_cents" integer;