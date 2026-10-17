-- ════════════════════════════════════════════════════════════════════
--  Migration 0019 — Add tutorial_completed column to profiles
--
--  Adds a separate boolean to track whether the user has seen the
--  first-time OXEN onboarding/tutorial. This is DISTINCT from
--  onboarding_completed (which tracks nickname/password setup).
--
--  Existing users who already completed profile setup are marked
--  tutorial_completed = true so they are NOT forced through the
--  tutorial on next login.
-- ════════════════════════════════════════════════════════════════════

-- Add column if it doesn't exist (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tutorial_completed'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN tutorial_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Mark existing users who already completed onboarding as having
-- also completed the tutorial — so established accounts are NOT
-- forced through the tutorial on next login.
UPDATE public.profiles
  SET tutorial_completed = true
  WHERE onboarding_completed = true
    AND tutorial_completed = false;

-- RLS: users can read their own tutorial_completed status
-- (already covered by existing profiles_select_self policy,
--  but add an explicit one in case it was narrowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_update_tutorial_self'
  ) THEN
    CREATE POLICY profiles_update_tutorial_self
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
