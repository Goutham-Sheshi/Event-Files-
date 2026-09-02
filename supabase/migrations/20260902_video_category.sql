-- ============================================================================
-- SHESHI VAULT - PHASE 2: CATEGORIZE EXISTING VIDEOS MIGRATION (WITH PODCAST)
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new
-- ============================================================================

-- 1. Add video_category column to public.vault_resources if it doesn't exist
ALTER TABLE public.vault_resources ADD COLUMN IF NOT EXISTS video_category text;

-- 2. Populate video_category for all existing video records based on tag and title rules
UPDATE public.vault_resources
SET video_category = CASE
  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%podcast%')
    OR title ILIKE '%podcast%' THEN 'Podcast'

  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%story%')
    OR title ILIKE '%story%' THEN 'Story'

  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%brand%' OR tag ILIKE '%logo%')
    OR title ILIKE '%brand%' OR title ILIKE '%logo%' THEN 'Brand'

  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%event%' OR tag ILIKE '%conrad%' OR tag ILIKE '%summit%')
    OR title ILIKE '%event%' OR title ILIKE '%conrad%' OR title ILIKE '%summit%' THEN 'Event'

  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%people%' OR tag ILIKE '%fun friday%' OR tag ILIKE '%marathon%')
    OR title ILIKE '%people%' OR title ILIKE '%fun friday%' OR title ILIKE '%marathon%' THEN 'People'

  WHEN EXISTS (SELECT 1 FROM unnest(tags) tag WHERE tag ILIKE '%product%' OR tag ILIKE '%demo%' OR tag ILIKE '%flow animation%' OR tag ILIKE '%module%')
    OR title ILIKE '%product%' OR title ILIKE '%demo%' OR title ILIKE '%flow animation%' OR title ILIKE '%module%' THEN 'Product'

  ELSE 'Other'
END
WHERE type = 'video';
