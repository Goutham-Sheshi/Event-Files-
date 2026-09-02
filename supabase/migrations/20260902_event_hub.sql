-- ============================================================================
-- SHESHI VAULT - EVENT HUB FEATURE MIGRATION
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new
-- ============================================================================

-- 1. Update events table schema
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date timestamptz;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by text;

-- 2. Create Event Resources table
CREATE TABLE IF NOT EXISTS public.event_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_format text,
  file_size text,
  category text NOT NULL DEFAULT 'other', -- 'documents' | 'presentations' | 'marketing' | 'design' | 'other'
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create Event Gallery table
CREATE TABLE IF NOT EXISTS public.event_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image', -- 'image' | 'video'
  title text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create Event Links table
CREATE TABLE IF NOT EXISTS public.event_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  added_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create Event Notes table (Notion-style rich notes)
CREATE TABLE IF NOT EXISTS public.event_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Privileges and Row Level Security
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.event_resources TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.event_gallery TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.event_links TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.event_notes TO anon, authenticated;

ALTER TABLE public.event_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notes ENABLE ROW LEVEL SECURITY;

-- Policies for public reading
DROP POLICY IF EXISTS "event_resources readable" ON public.event_resources;
CREATE POLICY "event_resources readable" ON public.event_resources FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "event_gallery readable" ON public.event_gallery;
CREATE POLICY "event_gallery readable" ON public.event_gallery FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "event_links readable" ON public.event_links;
CREATE POLICY "event_links readable" ON public.event_links FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "event_notes readable" ON public.event_notes;
CREATE POLICY "event_notes readable" ON public.event_notes FOR SELECT TO anon, authenticated USING (true);

-- Policies for writing
DROP POLICY IF EXISTS "event_resources write" ON public.event_resources;
CREATE POLICY "event_resources write" ON public.event_resources FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_gallery write" ON public.event_gallery;
CREATE POLICY "event_gallery write" ON public.event_gallery FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_links write" ON public.event_links;
CREATE POLICY "event_links write" ON public.event_links FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "event_notes write" ON public.event_notes;
CREATE POLICY "event_notes write" ON public.event_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
