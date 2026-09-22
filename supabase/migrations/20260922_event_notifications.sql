-- ============================================================================
-- SHESHI VAULT - EVENT NOTIFICATIONS SCHEMA
-- In-app toaster & Browser push notification store (NO EMAIL TRIGGERS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  event_title text NOT NULL,
  event_date timestamptz,
  location text,
  created_by text DEFAULT 'Admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated and anonymous vault users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'event_notifications' 
      AND policyname = 'Allow read on event_notifications'
  ) THEN
    CREATE POLICY "Allow read on event_notifications"
      ON public.event_notifications
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow insert access to authenticated and anonymous users (admin writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'event_notifications' 
      AND policyname = 'Allow insert on event_notifications'
  ) THEN
    CREATE POLICY "Allow insert on event_notifications"
      ON public.event_notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.event_notifications TO anon, authenticated;

-- Enable Realtime for event_notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_notifications;

-- Index for ordering by creation timestamp
CREATE INDEX IF NOT EXISTS idx_event_notifications_created_at ON public.event_notifications(created_at DESC);
