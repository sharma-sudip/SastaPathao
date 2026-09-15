-- Made idempotent by hand: this schema change was already applied directly
-- (both locally and in production) before the migration history diverged
-- across two machines and had to be reconciled -- see git log around this
-- commit. IF NOT EXISTS / exception-guarded DO blocks make this a no-op on
-- a DB that already has these objects, while still correctly creating them
-- on a fresh setup.
ALTER TYPE "public"."post_status" ADD VALUE IF NOT EXISTS 'COMPLETED' BEFORE 'CANCELLED';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coupon" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"redeemed" boolean DEFAULT false NOT NULL,
	"redeemed_at" timestamp,
	"redeemed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_code_unique" UNIQUE("code")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "coupon" ADD CONSTRAINT "coupon_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "coupon" ADD CONSTRAINT "coupon_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "coupon" ADD CONSTRAINT "coupon_redeemed_by_user_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
