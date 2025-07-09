CREATE TABLE "user_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"theme_colors" jsonb DEFAULT '{"primary":["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4"],"secondary":["#60a5fa","#34d399","#fbbf24","#f87171","#a78bfa","#22d3ee"],"accent":"#3b82f6","background":"#ffffff","foreground":"#020817","muted":"#f1f5f9","border":"#e2e8f0"}'::jsonb,
	"chart_defaults" jsonb DEFAULT '{"showLegend":true,"showGrid":true,"animation":true}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;