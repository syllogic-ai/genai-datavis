-- Enable RLS on all tables and create policies

-- Enable RLS on users table
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_policy" ON "users" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

-- Enable RLS on session table  
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_policy" ON "session" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on account table
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY; 
CREATE POLICY "account_policy" ON "account" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on verification table
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verification_policy" ON "verification" AS PERMISSIVE FOR ALL TO authenticated USING (identifier = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())) WITH CHECK (identifier = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid()));

-- Enable RLS on files table
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_policy" ON "files" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on dashboards table
ALTER TABLE "dashboards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dashboards_policy" ON "dashboards" AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid()::text = user_id OR is_public = true);
CREATE POLICY "dashboards_modify_policy" ON "dashboards" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "dashboards_update_policy" ON "dashboards" AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "dashboards_delete_policy" ON "dashboards" AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- Enable RLS on widgets table
ALTER TABLE "widgets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widgets_policy" ON "widgets" AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_id AND (dashboards.user_id = auth.uid()::text OR dashboards.is_public = true)));
CREATE POLICY "widgets_modify_policy" ON "widgets" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_id AND dashboards.user_id = auth.uid()::text));
CREATE POLICY "widgets_update_policy" ON "widgets" AS PERMISSIVE FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_id AND dashboards.user_id = auth.uid()::text)) WITH CHECK (EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_id AND dashboards.user_id = auth.uid()::text));
CREATE POLICY "widgets_delete_policy" ON "widgets" AS PERMISSIVE FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM dashboards WHERE dashboards.id = dashboard_id AND dashboards.user_id = auth.uid()::text));

-- Enable RLS on chats table
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chats_policy" ON "chats" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on messages table
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_policy" ON "messages" AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()::text)) WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()::text));

-- Enable RLS on tasks table
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_policy" ON "tasks" AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()::text)) WITH CHECK (EXISTS (SELECT 1 FROM chats WHERE chats.id = chat_id AND chats.user_id = auth.uid()::text));

-- Enable RLS on llm_usage table
ALTER TABLE "llm_usage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "llm_usage_policy" ON "llm_usage" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

-- Enable RLS on themes table
ALTER TABLE "themes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes_policy" ON "themes" AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid()::text = user_id OR is_default = true);
CREATE POLICY "themes_modify_policy" ON "themes" AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "themes_update_policy" ON "themes" AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid()::text = user_id AND is_default = false) WITH CHECK (auth.uid()::text = user_id AND is_default = false);
CREATE POLICY "themes_delete_policy" ON "themes" AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid()::text = user_id AND is_default = false);

-- Enable RLS on user_preferences table
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_policy" ON "user_preferences" AS PERMISSIVE FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);