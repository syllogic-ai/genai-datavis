-- =====================================
-- Auth functions for RLS policies
-- These functions need to be created in Supabase
-- Run this in your Supabase SQL Editor
-- =====================================

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Create the auth.jwt() function that RLS policies expect
-- This function reads the JWT claims from the request context
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', TRUE)::jsonb,
    '{}'::jsonb
  );
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.jwt() TO authenticated, anon;

-- Test the function (should return empty object initially)
SELECT auth.jwt();