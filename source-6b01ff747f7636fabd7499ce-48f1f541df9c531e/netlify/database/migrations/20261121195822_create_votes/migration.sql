CREATE TABLE "votes" (
	"id" serial PRIMARY KEY,
	"voter_id" text NOT NULL UNIQUE,
	"couple_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "votes_couple_id_idx" ON "votes" ("couple_id");