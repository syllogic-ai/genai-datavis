-- Check if charts table exists before revoking permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'charts' AND table_schema = 'public') THEN
        EXECUTE 'revoke delete on table "public"."charts" from "anon"';
        EXECUTE 'revoke insert on table "public"."charts" from "anon"';
        EXECUTE 'revoke references on table "public"."charts" from "anon"';
        EXECUTE 'revoke select on table "public"."charts" from "anon"';
        EXECUTE 'revoke trigger on table "public"."charts" from "anon"';
        EXECUTE 'revoke truncate on table "public"."charts" from "anon"';
        EXECUTE 'revoke update on table "public"."charts" from "anon"';
        EXECUTE 'revoke delete on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke insert on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke references on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke select on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke trigger on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke truncate on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke update on table "public"."charts" from "authenticated"';
        EXECUTE 'revoke delete on table "public"."charts" from "service_role"';
        EXECUTE 'revoke insert on table "public"."charts" from "service_role"';
        EXECUTE 'revoke references on table "public"."charts" from "service_role"';
        EXECUTE 'revoke select on table "public"."charts" from "service_role"';
        EXECUTE 'revoke trigger on table "public"."charts" from "service_role"';
        EXECUTE 'revoke truncate on table "public"."charts" from "service_role"';
        EXECUTE 'revoke update on table "public"."charts" from "service_role"';
    END IF;
END
$$;

-- Drop constraints if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'charts_chat_id_chats_id_fk' AND table_name = 'charts') THEN
        EXECUTE 'alter table "public"."charts" drop constraint "charts_chat_id_chats_id_fk"';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chats_file_id_files_id_fk' AND table_name = 'chats') THEN
        EXECUTE 'alter table "public"."chats" drop constraint "chats_file_id_files_id_fk"';
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'charts_pkey' AND table_name = 'charts') THEN
        EXECUTE 'alter table "public"."charts" drop constraint "charts_pkey"';
    END IF;
END
$$;

-- Drop index if it exists
drop index if exists "public"."charts_pkey";

-- Drop table if it exists
drop table if exists "public"."charts";

-- Create dashboards table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboards' AND table_schema = 'public') THEN
        CREATE TABLE "public"."dashboards" (
            "id" text not null,
            "user_id" text not null,
            "name" text not null default 'New Dashboard'::text,
            "description" text,
            "created_at" timestamp without time zone default now(),
            "updated_at" timestamp without time zone default now(),
            "icon" text not null default 'document-text'::text
        );
    END IF;
END
$$;

-- Create widgets table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widgets' AND table_schema = 'public') THEN
        CREATE TABLE "public"."widgets" (
            "id" text not null,
            "dashboard_id" text not null,
            "type" text not null,
            "config" jsonb not null,
            "created_at" timestamp without time zone default now(),
            "data" jsonb,
            "layout" jsonb not null,
            "chat_id" text,
            "is_configured" boolean default false,
            "updated_at" timestamp without time zone default now(),
            "title" text not null,
            "sql" text,
            "cache_key" text,
            "last_data_fetch" timestamp without time zone
        );
    END IF;
END
$$;

-- Drop column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'file_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."chats" DROP COLUMN "file_id";
    END IF;
END
$$;

-- Add dashboard_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'dashboard_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."chats" ADD COLUMN "dashboard_id" text not null;
    END IF;
END
$$;

alter table "public"."chats" alter column "title" set default 'Dashboard Chat'::text;

alter table "public"."chats" alter column "user_id" set not null;

-- Add dashboard_id column to files if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'dashboard_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."files" ADD COLUMN "dashboard_id" text;
    END IF;
END
$$;

-- Add sanitized_filename column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'files' AND column_name = 'sanitized_filename' AND table_schema = 'public') THEN
        ALTER TABLE "public"."files" ADD COLUMN "sanitized_filename" text;
    END IF;
END
$$;

alter table "public"."files" alter column "original_filename" set not null;

-- Drop columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'api_request' AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" DROP COLUMN "api_request";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'compute_time' AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" DROP COLUMN "compute_time";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'provider' AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" DROP COLUMN "provider";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'request_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" DROP COLUMN "request_id";
    END IF;
END
$$;

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llm_usage' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" ADD COLUMN "user_id" text;
    END IF;
END
$$;

-- Add missing columns to widgets table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'dashboard_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "dashboard_id" text not null;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'type' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "type" text not null;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'config' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "config" jsonb not null;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'data' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "data" jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'layout' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "layout" jsonb not null;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'chat_id' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "chat_id" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'is_configured' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "is_configured" boolean default false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'title' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "title" text not null;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'sql' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "sql" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'cache_key' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "cache_key" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'last_data_fetch' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "last_data_fetch" timestamp without time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'created_at' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "created_at" timestamp without time zone default now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'widgets' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD COLUMN "updated_at" timestamp without time zone default now();
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS dashboards_pkey ON public.dashboards USING btree (id);

CREATE UNIQUE INDEX IF NOT EXISTS widgets_pkey ON public.widgets USING btree (id);

-- Add constraints only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'dashboards_pkey' 
                   AND table_name = 'dashboards' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."dashboards" ADD CONSTRAINT "dashboards_pkey" PRIMARY KEY USING INDEX "dashboards_pkey";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'widgets_pkey' 
                   AND table_name = 'widgets' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD CONSTRAINT "widgets_pkey" PRIMARY KEY USING INDEX "widgets_pkey";
    END IF;
END
$$;

-- Add foreign key constraints only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chats_dashboard_id_dashboards_id_fk' 
                   AND table_name = 'chats' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."chats" ADD CONSTRAINT "chats_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;
        ALTER TABLE "public"."chats" VALIDATE CONSTRAINT "chats_dashboard_id_dashboards_id_fk";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'dashboards_user_id_users_id_fk' 
                   AND table_name = 'dashboards' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."dashboards" ADD CONSTRAINT "dashboards_user_id_users_id_fk" FOREIGN KEY (user_id) REFERENCES users(id) not valid;
        ALTER TABLE "public"."dashboards" VALIDATE CONSTRAINT "dashboards_user_id_users_id_fk";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'files_dashboard_id_dashboards_id_fk' 
                   AND table_name = 'files' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."files" ADD CONSTRAINT "files_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;
        ALTER TABLE "public"."files" VALIDATE CONSTRAINT "files_dashboard_id_dashboards_id_fk";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'llm_usage_user_id_users_id_fk' 
                   AND table_name = 'llm_usage' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."llm_usage" ADD CONSTRAINT "llm_usage_user_id_users_id_fk" FOREIGN KEY (user_id) REFERENCES users(id) not valid;
        ALTER TABLE "public"."llm_usage" VALIDATE CONSTRAINT "llm_usage_user_id_users_id_fk";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'widgets_chat_id_chats_id_fk' 
                   AND table_name = 'widgets' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD CONSTRAINT "widgets_chat_id_chats_id_fk" FOREIGN KEY (chat_id) REFERENCES chats(id) not valid;
        ALTER TABLE "public"."widgets" VALIDATE CONSTRAINT "widgets_chat_id_chats_id_fk";
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'widgets_dashboard_id_dashboards_id_fk' 
                   AND table_name = 'widgets' 
                   AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" ADD CONSTRAINT "widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;
        ALTER TABLE "public"."widgets" VALIDATE CONSTRAINT "widgets_dashboard_id_dashboards_id_fk";
    END IF;
END
$$;

grant delete on table "public"."dashboards" to "anon";

grant insert on table "public"."dashboards" to "anon";

grant references on table "public"."dashboards" to "anon";

grant select on table "public"."dashboards" to "anon";

grant trigger on table "public"."dashboards" to "anon";

grant truncate on table "public"."dashboards" to "anon";

grant update on table "public"."dashboards" to "anon";

grant delete on table "public"."dashboards" to "authenticated";

grant insert on table "public"."dashboards" to "authenticated";

grant references on table "public"."dashboards" to "authenticated";

grant select on table "public"."dashboards" to "authenticated";

grant trigger on table "public"."dashboards" to "authenticated";

grant truncate on table "public"."dashboards" to "authenticated";

grant update on table "public"."dashboards" to "authenticated";

grant delete on table "public"."dashboards" to "service_role";

grant insert on table "public"."dashboards" to "service_role";

grant references on table "public"."dashboards" to "service_role";

grant select on table "public"."dashboards" to "service_role";

grant trigger on table "public"."dashboards" to "service_role";

grant truncate on table "public"."dashboards" to "service_role";

grant update on table "public"."dashboards" to "service_role";

grant delete on table "public"."widgets" to "anon";

grant insert on table "public"."widgets" to "anon";

grant references on table "public"."widgets" to "anon";

grant select on table "public"."widgets" to "anon";

grant trigger on table "public"."widgets" to "anon";

grant truncate on table "public"."widgets" to "anon";

grant update on table "public"."widgets" to "anon";

grant delete on table "public"."widgets" to "authenticated";

grant insert on table "public"."widgets" to "authenticated";

grant references on table "public"."widgets" to "authenticated";

grant select on table "public"."widgets" to "authenticated";

grant trigger on table "public"."widgets" to "authenticated";

grant truncate on table "public"."widgets" to "authenticated";

grant update on table "public"."widgets" to "authenticated";

grant delete on table "public"."widgets" to "service_role";

grant insert on table "public"."widgets" to "service_role";

grant references on table "public"."widgets" to "service_role";

grant select on table "public"."widgets" to "service_role";

grant trigger on table "public"."widgets" to "service_role";

grant truncate on table "public"."widgets" to "service_role";

grant update on table "public"."widgets" to "service_role";



