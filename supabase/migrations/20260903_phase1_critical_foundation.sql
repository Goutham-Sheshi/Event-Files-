-- ============================================================================
-- SHESHI VAULT — PHASE 1: CRITICAL FOUNDATION MIGRATION
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ikkyziyugrnkolqnrxfo/sql/new
-- ============================================================================

-- 1. Add Phase 1 Columns to vault_resources
ALTER TABLE public.vault_resources
  ADD COLUMN IF NOT EXISTS content_status text DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS version text DEFAULT 'v1.0',
  ADD COLUMN IF NOT EXISTS parent_resource_id uuid REFERENCES public.vault_resources(id) ON DELETE SET NULL;

-- 2. Add Content Status Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_vault_resources_content_status'
  ) THEN
    ALTER TABLE public.vault_resources
      ADD CONSTRAINT chk_vault_resources_content_status
      CHECK (content_status IN ('Active', 'Official', 'Archived', 'Deprecated'));
  END IF;
END $$;

-- 3. Backfill Existing Records
UPDATE public.vault_resources
SET
  content_status = COALESCE(content_status, 'Active'),
  is_official = CASE WHEN content_status = 'Official' THEN true ELSE COALESCE(is_official, false) END,
  version = COALESCE(version, 'v1.0')
WHERE content_status IS NULL OR version IS NULL;

-- 4. Trigger to Keep is_official and content_status in sync
CREATE OR REPLACE FUNCTION public.sync_vault_resource_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.content_status = 'Official' THEN
    NEW.is_official := true;
  ELSIF NEW.content_status IS DISTINCT FROM OLD.content_status AND NEW.content_status != 'Official' THEN
    NEW.is_official := false;
  END IF;

  -- Ensure default version if empty
  IF NEW.version IS NULL OR trim(NEW.version) = '' THEN
    NEW.version := 'v1.0';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vault_resource_status ON public.vault_resources;
CREATE TRIGGER trg_sync_vault_resource_status
  BEFORE INSERT OR UPDATE OF content_status, is_official, version
  ON public.vault_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vault_resource_status();

-- 5. Helper Function to Rename Global Tags
CREATE OR REPLACE FUNCTION public.admin_rename_tag(old_tag text, new_tag text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_old text := trim(old_tag);
  clean_new text := trim(new_tag);
BEGIN
  IF clean_old = '' OR clean_new = '' THEN RETURN; END IF;

  UPDATE public.vault_resources
  SET tags = (
    SELECT array_agg(DISTINCT CASE WHEN trim(tag) ILIKE clean_old THEN clean_new ELSE trim(tag) END)
    FROM unnest(tags) AS tag
    WHERE trim(tag) != ''
  )
  WHERE tags @> ARRAY[clean_old] OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE clean_old);
END;
$$;

-- 6. Helper Function to Merge Multiple Global Tags into Target Tag
CREATE OR REPLACE FUNCTION public.admin_merge_tags(source_tags text[], target_tag text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_target text := trim(target_tag);
BEGIN
  IF clean_target = '' OR source_tags IS NULL OR array_length(source_tags, 1) IS NULL THEN RETURN; END IF;

  UPDATE public.vault_resources
  SET tags = (
    SELECT array_agg(DISTINCT CASE WHEN trim(tag) = ANY(source_tags) OR trim(tag) ILIKE ANY(source_tags) THEN clean_target ELSE trim(tag) END)
    FROM unnest(tags) AS tag
    WHERE trim(tag) != ''
  )
  WHERE EXISTS (
    SELECT 1 FROM unnest(tags) t WHERE t = ANY(source_tags) OR t ILIKE ANY(source_tags)
  );
END;
$$;

-- 7. Helper Function to Delete a Tag Across All Resources
CREATE OR REPLACE FUNCTION public.admin_delete_tag(target_tag text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  clean_tag text := trim(target_tag);
BEGIN
  IF clean_tag = '' THEN RETURN; END IF;

  UPDATE public.vault_resources
  SET tags = (
    SELECT array_agg(DISTINCT trim(tag))
    FROM unnest(tags) AS tag
    WHERE trim(tag) != '' AND NOT (trim(tag) ILIKE clean_tag)
  )
  WHERE EXISTS (
    SELECT 1 FROM unnest(tags) t WHERE t ILIKE clean_tag
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_rename_tag(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tags(text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_tag(text) TO authenticated;
