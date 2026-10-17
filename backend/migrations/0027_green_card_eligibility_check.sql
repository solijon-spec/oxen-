-- ============================================================
-- Migration 0027: Green Card (DV Lottery) eligibility checker
--
-- A platform-level (not agency-specific) paid AI service: a user
-- uploads their passport (PDF) + photo (JPEG), pays a small fee,
-- and an AI vision model checks the photo/passport against U.S.
-- Diversity Visa photo & eligibility requirements.
--
-- Documents are passport scans — far more sensitive than the
-- existing "consulting" bucket's public-read documents, so this
-- gets its OWN PRIVATE bucket with strict per-user RLS (never
-- public), unlike the broad-public "consulting" bucket from
-- migration 0021.
--
-- The AI provider + API key is configured once by the platform
-- owner (owner-admin Settings) and stored in `platform_ai_settings`,
-- readable only by is_owner() — the actual AI call happens
-- server-side in the `green-card-check` Edge Function using the
-- service-role key, so the API key is never sent to the browser.
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Platform-wide AI settings (single row, owner-only)
CREATE TABLE IF NOT EXISTS platform_ai_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id), -- enforces a single row
  provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai', 'anthropic')),
  api_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE platform_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_settings_owner_all ON platform_ai_settings FOR ALL
  TO authenticated USING (is_owner()) WITH CHECK (is_owner());

-- 2. Green Card eligibility check submissions
CREATE TABLE IF NOT EXISTS green_card_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passport_path TEXT NOT NULL, -- storage object path, private bucket
  photo_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'processing', 'completed', 'failed')),
  payment_amount NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMPTZ,
  ai_eligible BOOLEAN,
  ai_summary TEXT,
  ai_issues JSONB DEFAULT '[]'::jsonb,
  ai_raw JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_green_card_checks_user_id ON green_card_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_green_card_checks_status ON green_card_checks(status);

ALTER TABLE green_card_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY gcc_read ON green_card_checks FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR is_owner());

CREATE POLICY gcc_insert ON green_card_checks FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- NOTE: the simulated (non-production) payment step updates `status`
-- client-side, so the owning user can update their own row for now.
-- Once a real payment gateway is wired up, tighten this to
-- owner()/service-role only and move the paid->processing transition
-- into a payment-webhook-triggered RPC instead.
CREATE POLICY gcc_update ON green_card_checks FOR UPDATE
  TO authenticated USING (user_id = auth.uid() OR is_owner())
  WITH CHECK (user_id = auth.uid() OR is_owner());

-- 3. Private storage bucket — NEVER public, unlike `consulting`.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('green-card-docs', 'green-card-docs', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Users may upload only into their own `${auth.uid()}/...` folder.
DROP POLICY IF EXISTS "green_card_docs_upload" ON storage.objects;
CREATE POLICY "green_card_docs_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'green-card-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may read only their own files; the platform owner may read all
-- (to review submissions / debug failed AI checks).
DROP POLICY IF EXISTS "green_card_docs_read" ON storage.objects;
CREATE POLICY "green_card_docs_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'green-card-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_owner())
  );

COMMENT ON TABLE green_card_checks IS
  'Paid AI eligibility checks against a passport + photo upload. Platform-level feature, not tied to any single agency.';
COMMENT ON TABLE platform_ai_settings IS
  'Single-row table holding the AI provider + API key used server-side by the green-card-check Edge Function. Owner-only.';
