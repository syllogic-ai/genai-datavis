-- Fix widgets table constraint naming issue
-- The remote database has a constraint named 'charts_pkey' on the widgets table
-- This should be 'widgets_pkey' to match the table name

-- Drop the incorrect constraint if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'charts_pkey' 
               AND table_name = 'widgets' 
               AND table_schema = 'public') THEN
        ALTER TABLE "public"."widgets" DROP CONSTRAINT "charts_pkey";
    END IF;
END
$$;

-- Drop the associated index if it exists
DROP INDEX IF EXISTS "public"."charts_pkey";

-- Create the correct index and constraint
CREATE UNIQUE INDEX IF NOT EXISTS widgets_pkey ON public.widgets USING btree (id);

-- Add the correct primary key constraint
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
