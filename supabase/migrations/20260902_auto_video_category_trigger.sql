-- ============================================================================
-- SHESHI VAULT - AUTO VIDEO CATEGORY TRIGGER
-- Run this AFTER running 20260902_video_category.sql
-- https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new
-- ============================================================================

-- 1. Create a function that assigns video_category from tags automatically
CREATE OR REPLACE FUNCTION public.auto_assign_video_category()
RETURNS TRIGGER AS $$
DECLARE
  tag_text TEXT;
BEGIN
  -- Only run for video type records
  IF NEW.type != 'video' THEN
    RETURN NEW;
  END IF;

  -- Build a single lowercase string of all tags for easy matching
  tag_text := LOWER(array_to_string(COALESCE(NEW.tags, ARRAY[]::text[]), ' '));

  -- Auto-assign based on tag content (Podcast checked first as it's specific)
  IF tag_text ILIKE '%podcast%' OR NEW.title ILIKE '%podcast%' THEN
    NEW.video_category := 'Podcast';
  ELSIF tag_text ILIKE '%story%' OR NEW.title ILIKE '%story%' THEN
    NEW.video_category := 'Story';
  ELSIF tag_text ILIKE '%brand%' OR tag_text ILIKE '%logo%'
     OR NEW.title ILIKE '%brand%' OR NEW.title ILIKE '%logo%' THEN
    NEW.video_category := 'Brand';
  ELSIF tag_text ILIKE '%event%' OR tag_text ILIKE '%summit%' OR tag_text ILIKE '%conrad%'
     OR NEW.title ILIKE '%event%' OR NEW.title ILIKE '%summit%' OR NEW.title ILIKE '%conrad%' THEN
    NEW.video_category := 'Event';
  ELSIF tag_text ILIKE '%people%' OR tag_text ILIKE '%fun friday%' OR tag_text ILIKE '%marathon%'
     OR NEW.title ILIKE '%people%' OR NEW.title ILIKE '%fun friday%' OR NEW.title ILIKE '%marathon%' THEN
    NEW.video_category := 'People';
  ELSIF tag_text ILIKE '%product%' OR tag_text ILIKE '%demo%'
     OR tag_text ILIKE '%flow animation%' OR tag_text ILIKE '%module%'
     OR NEW.title ILIKE '%product%' OR NEW.title ILIKE '%demo%' THEN
    NEW.video_category := 'Product';
  ELSE
    -- Only default to Other if no category is already set
    IF NEW.video_category IS NULL THEN
      NEW.video_category := 'Other';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on vault_resources
DROP TRIGGER IF EXISTS trg_auto_video_category ON public.vault_resources;

CREATE TRIGGER trg_auto_video_category
  BEFORE INSERT OR UPDATE OF tags, title, type
  ON public.vault_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_video_category();
