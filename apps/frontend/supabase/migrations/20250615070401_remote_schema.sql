

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "drizzle";


ALTER SCHEMA "drizzle" OWNER TO "postgres";




ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_last_chart_message"("chat_id" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result text;
BEGIN
    -- Find the last message with role 'chart'
    SELECT (elem->>'content')::text INTO result
    FROM chats,
         LATERAL jsonb_array_elements(conversation) WITH ORDINALITY AS t(elem, ordinality)
    WHERE chats.id = chat_id
      AND (elem->>'role')::text = 'chart'
    ORDER BY ordinality DESC
    LIMIT 1;
    
    -- Return NULL if no chart message found
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_last_chart_message"("chat_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_messages"("chat_id" "text", "n" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    conv JSONB;
    conv_length INTEGER;
BEGIN
    -- Get the conversation array
    SELECT conversation INTO conv
    FROM chats
    WHERE id = chat_id;
    
    -- Get array length
    conv_length := jsonb_array_length(conv);
    
    -- Return last n messages
    IF conv_length <= n THEN
        RETURN conv;
    ELSE
        RETURN (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(conv) WITH ORDINALITY arr(elem, idx)
                WHERE idx > conv_length - n
                ORDER BY idx
            ) sub
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_last_messages"("chat_id" "text", "n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_n_messages"("chat_id" "text", "n" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    conv JSONB;
    conv_length INTEGER;
BEGIN
    -- Get the conversation array
    SELECT conversation INTO conv
    FROM chats
    WHERE id = chat_id;
    
    -- Get array length
    conv_length := jsonb_array_length(conv);
    
    -- Return last n messages
    IF conv_length <= n THEN
        RETURN conv;
    ELSE
        RETURN (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(conv) WITH ORDINALITY arr(elem, idx)
                WHERE idx > conv_length - n
                ORDER BY idx
            ) sub
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_last_n_messages"("chat_id" "text", "n" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_n_messages"("chat_id" "uuid" DEFAULT '87939486-f970-4c1a-8b8d-85262607d47c'::"uuid", "n" integer DEFAULT 5) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    conv JSONB;
    conv_length INTEGER;
BEGIN
    -- Get the conversation array
    SELECT conversation INTO conv
    FROM chats
    WHERE id = chat_id;
    
    -- Get array length
    conv_length := jsonb_array_length(conv);
    
    -- Return last n messages
    IF conv_length <= n THEN
        RETURN conv;
    ELSE
        RETURN (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(conv) WITH ORDINALITY arr(elem, idx)
                WHERE idx > conv_length - n
                ORDER BY idx
            ) sub
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_last_n_messages"("chat_id" "uuid", "n" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" integer NOT NULL,
    "hash" "text" NOT NULL,
    "created_at" bigint
);


ALTER TABLE "drizzle"."__drizzle_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "drizzle"."__drizzle_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "drizzle"."__drizzle_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNED BY "drizzle"."__drizzle_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."charts" (
    "id" "text" NOT NULL,
    "chat_id" "text",
    "chart_type" "text",
    "chart_specs" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "sql" "text"
);


ALTER TABLE "public"."charts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "text" NOT NULL,
    "user_id" "text",
    "file_id" "text",
    "title" "text" DEFAULT 'New Chat'::"text" NOT NULL,
    "conversation" "jsonb" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "original_filename" "text",
    "storage_path" "text" NOT NULL,
    "status" "text" DEFAULT 'ready'::"text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."llm_usage" (
    "id" "text" NOT NULL,
    "request_id" "text" NOT NULL,
    "chat_id" "text",
    "model" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "api_request" "text" NOT NULL,
    "input_tokens" integer NOT NULL,
    "output_tokens" integer NOT NULL,
    "compute_time" real NOT NULL,
    "total_cost" real NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."llm_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "drizzle"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"drizzle"."__drizzle_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "drizzle"."__drizzle_migrations"
    ADD CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."charts"
    ADD CONSTRAINT "charts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."llm_usage"
    ADD CONSTRAINT "llm_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."charts"
    ADD CONSTRAINT "charts_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."llm_usage"
    ADD CONSTRAINT "llm_usage_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chats";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "service_role";


















































































































































































































































































































GRANT ALL ON TABLE "public"."charts" TO "service_role";



GRANT SELECT ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."llm_usage" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."llm_usage" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."llm_usage" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES  TO "anon";



























RESET ALL;
