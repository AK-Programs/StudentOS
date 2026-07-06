-- ============================================================
-- StudentOS Supabase Database Setup
-- Run this in your Supabase SQL Editor once to set up all tables
-- and RLS policies for the demo environment.
-- ============================================================

-- ==================== MATERIALS TABLE ====================
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  category TEXT,
  type TEXT NOT NULL DEFAULT '',
  url TEXT,
  file_url TEXT,
  attachment_url TEXT,
  storage_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  description TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  uploader_uid TEXT,
  uploader_house TEXT,
  uploader_section TEXT,
  created_at BIGINT DEFAULT 0,
  created_at_date TEXT,
  class_grade TEXT,
  class_section TEXT,
  due_date TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  visibility TEXT DEFAULT 'student',
  visible_to_grades TEXT[] DEFAULT '{}',
  visible_to_sections TEXT[] DEFAULT '{}',
  visible_to_houses TEXT[] DEFAULT '{}',
  downloads INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  liked_by TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT FALSE,
  comments JSONB DEFAULT '[]',
  question_paper_year TEXT,
  ai_summary TEXT,
  ai_quiz JSONB,
  raw_data JSONB
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_materials" ON public.materials;
DROP POLICY IF EXISTS "materials_select" ON public.materials;
DROP POLICY IF EXISTS "materials_insert" ON public.materials;
DROP POLICY IF EXISTS "materials_update" ON public.materials;
DROP POLICY IF EXISTS "materials_delete" ON public.materials;
CREATE POLICY "materials_select" ON public.materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "materials_insert" ON public.materials FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND uploader_uid = auth.uid()::text);
CREATE POLICY "materials_update" ON public.materials FOR UPDATE USING (auth.role() = 'authenticated' AND uploader_uid = auth.uid()::text);
CREATE POLICY "materials_delete" ON public.materials FOR DELETE USING (auth.role() = 'authenticated' AND uploader_uid = auth.uid()::text);

-- ==================== ASSIGNMENTS TABLE ====================
CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'assignment',
  resource_type TEXT DEFAULT 'assignment',
  target_grade TEXT DEFAULT 'All Grades',
  class TEXT DEFAULT 'All Grades',
  target_section TEXT DEFAULT 'All Sections',
  section TEXT DEFAULT 'All Sections',
  url TEXT,
  file_url TEXT,
  file_data TEXT,
  storage_path TEXT,
  gallery_urls JSONB DEFAULT '[]',
  file_name TEXT,
  created_at BIGINT DEFAULT 0,
  author TEXT DEFAULT 'Teacher',
  raw_data JSONB
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_assignments" ON public.assignments;
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
DROP POLICY IF EXISTS "assignments_insert" ON public.assignments;
DROP POLICY IF EXISTS "assignments_update_delete" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assignments_insert" ON public.assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "assignments_update_delete" ON public.assignments FOR ALL USING (auth.role() = 'authenticated' AND author = auth.uid()::text) WITH CHECK (auth.role() = 'authenticated');

-- ==================== SCHOOL RESOURCES TABLE ====================
CREATE TABLE IF NOT EXISTS public.school_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content TEXT DEFAULT '',
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'resource',
  resource_type TEXT DEFAULT 'resource',
  target_grade TEXT DEFAULT 'All Grades',
  class TEXT DEFAULT 'All Grades',
  target_section TEXT DEFAULT 'All Sections',
  section TEXT DEFAULT 'All Sections',
  url TEXT,
  file_url TEXT,
  file_data TEXT,
  storage_path TEXT,
  gallery_urls JSONB DEFAULT '[]',
  file_name TEXT,
  created_at BIGINT DEFAULT 0,
  author TEXT DEFAULT 'Teacher',
  raw_data JSONB
);

ALTER TABLE public.school_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_school_resources" ON public.school_resources;
DROP POLICY IF EXISTS "school_resources_select" ON public.school_resources;
DROP POLICY IF EXISTS "school_resources_modify" ON public.school_resources;
CREATE POLICY "school_resources_select" ON public.school_resources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "school_resources_modify" ON public.school_resources FOR ALL USING (auth.role() = 'authenticated' AND author = auth.uid()::text) WITH CHECK (auth.role() = 'authenticated');

-- ==================== AI BUDDY CHATS TABLE ====================
CREATE TABLE IF NOT EXISTS public.ai_buddy_chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  persona_id TEXT DEFAULT 'study_buddy',
  mode TEXT DEFAULT 'explanatory',
  messages JSONB DEFAULT '[]',
  attached_files JSONB DEFAULT '[]',
  created_at BIGINT DEFAULT 0
);

ALTER TABLE public.ai_buddy_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_ai_buddy_chats" ON public.ai_buddy_chats;
DROP POLICY IF EXISTS "ai_buddy_chats_owner" ON public.ai_buddy_chats;
CREATE POLICY "ai_buddy_chats_owner" ON public.ai_buddy_chats FOR ALL USING (auth.role() = 'authenticated' AND user_id = auth.uid()::text) WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid()::text);

-- ==================== MESSAGES TABLE (Global Chat) ====================
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  owner_uid TEXT DEFAULT '',
  name TEXT DEFAULT '',
  role TEXT DEFAULT 'student',
  house TEXT,
  message TEXT NOT NULL DEFAULT '',
  created_at BIGINT DEFAULT 0,
  target_id TEXT,
  shared_material_id TEXT
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND owner_uid = auth.uid()::text);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE USING (auth.role() = 'authenticated' AND owner_uid = auth.uid()::text);

-- ==================== CHAT ROOMS TABLE ====================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT ''
);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_chat_rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_select" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_modify" ON public.chat_rooms;
CREATE POLICY "chat_rooms_select" ON public.chat_rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "chat_rooms_modify" ON public.chat_rooms FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ==================== USER PROFILES TABLE ====================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id TEXT PRIMARY KEY,
  uid TEXT UNIQUE,
  name TEXT DEFAULT '',
  email TEXT,
  role TEXT DEFAULT 'student',
  requested_role TEXT,
  account_status TEXT DEFAULT 'approved',
  grade TEXT,
  section TEXT,
  house TEXT,
  department TEXT,
  subjects TEXT[] DEFAULT '{}',
  specialty_subject TEXT,
  designation TEXT,
  photo_url TEXT,
  bio TEXT,
  points INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  raw_data JSONB,
  created_at BIGINT DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "user_profiles_own" ON public.user_profiles FOR ALL USING (auth.role() = 'authenticated' AND uid = auth.uid()::text) WITH CHECK (auth.role() = 'authenticated' AND uid = auth.uid()::text);

-- ==================== STORAGE BUCKET ====================
-- Ensure the StudentOS bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('StudentOS', 'StudentOS', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload and read from the bucket
DROP POLICY IF EXISTS "allow_all_uploads" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_owner_update_delete" ON storage.objects;
CREATE POLICY "storage_authenticated_read" ON storage.objects FOR SELECT USING (bucket_id = 'StudentOS' AND auth.role() = 'authenticated');
CREATE POLICY "storage_authenticated_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'StudentOS' AND auth.role() = 'authenticated');
CREATE POLICY "storage_owner_update_delete" ON storage.objects FOR DELETE USING (bucket_id = 'StudentOS' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
