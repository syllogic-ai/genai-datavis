CREATE TABLE "dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text DEFAULT 'New Dashboard' NOT NULL,
	"description" text,
	"icon" text DEFAULT 'document-text' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "charts" RENAME TO "widgets";--> statement-breakpoint
ALTER TABLE "widgets" RENAME COLUMN "chart_type" TO "type";--> statement-breakpoint
ALTER TABLE "widgets" RENAME COLUMN "chart_specs" TO "config";--> statement-breakpoint
ALTER TABLE "widgets" DROP CONSTRAINT "charts_chat_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_file_id_files_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "title" SET DEFAULT 'Dashboard Chat';--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "original_filename" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "dashboard_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "layout" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "is_configured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "cache_key" text;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "last_data_fetch" timestamp;--> statement-breakpoint
ALTER TABLE "widgets" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "dashboard_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "dashboard_id" text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "sanitized_filename" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "file_id";--> statement-breakpoint
ALTER TABLE "llm_usage" DROP COLUMN "request_id";--> statement-breakpoint
ALTER TABLE "llm_usage" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "llm_usage" DROP COLUMN "api_request";--> statement-breakpoint
ALTER TABLE "llm_usage" DROP COLUMN "compute_time";