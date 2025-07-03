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

create table "public"."dashboards" (
    "id" text not null,
    "user_id" text not null,
    "name" text not null default 'New Dashboard'::text,
    "description" text,
    "created_at" timestamp without time zone default now(),
    "updated_at" timestamp without time zone default now(),
    "icon" text not null default 'document-text'::text
);


create table "public"."widgets" (
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


alter table "public"."chats" drop column "file_id";

alter table "public"."chats" add column "dashboard_id" text not null;

alter table "public"."chats" alter column "title" set default 'Dashboard Chat'::text;

alter table "public"."chats" alter column "user_id" set not null;

alter table "public"."files" add column "dashboard_id" text;

alter table "public"."files" add column "sanitized_filename" text;

alter table "public"."files" alter column "original_filename" set not null;

alter table "public"."llm_usage" drop column "api_request";

alter table "public"."llm_usage" drop column "compute_time";

alter table "public"."llm_usage" drop column "provider";

alter table "public"."llm_usage" drop column "request_id";

alter table "public"."llm_usage" add column "user_id" text;

CREATE UNIQUE INDEX dashboards_pkey ON public.dashboards USING btree (id);

CREATE UNIQUE INDEX widgets_pkey ON public.widgets USING btree (id);

alter table "public"."dashboards" add constraint "dashboards_pkey" PRIMARY KEY using index "dashboards_pkey";

alter table "public"."widgets" add constraint "widgets_pkey" PRIMARY KEY using index "widgets_pkey";

alter table "public"."chats" add constraint "chats_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;

alter table "public"."chats" validate constraint "chats_dashboard_id_dashboards_id_fk";

alter table "public"."dashboards" add constraint "dashboards_user_id_users_id_fk" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."dashboards" validate constraint "dashboards_user_id_users_id_fk";

alter table "public"."files" add constraint "files_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;

alter table "public"."files" validate constraint "files_dashboard_id_dashboards_id_fk";

alter table "public"."llm_usage" add constraint "llm_usage_user_id_users_id_fk" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."llm_usage" validate constraint "llm_usage_user_id_users_id_fk";

alter table "public"."widgets" add constraint "widgets_chat_id_chats_id_fk" FOREIGN KEY (chat_id) REFERENCES chats(id) not valid;

alter table "public"."widgets" validate constraint "widgets_chat_id_chats_id_fk";

alter table "public"."widgets" add constraint "widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE not valid;

alter table "public"."widgets" validate constraint "widgets_dashboard_id_dashboards_id_fk";

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



