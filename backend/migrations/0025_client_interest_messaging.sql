-- ============================================================
-- Migration 0025: Site-visitor interest -> CRM lead + messaging
--
-- Lets a signed-in OXEN site visitor click "Interested" / "Contact"
-- on a tour package or agency profile, which:
--   1. finds-or-creates a `consulting_clients` row tied to their own
--      auth.uid() (so it shows up in the agency's CRM pipeline), and
--   2. opens a real 1:1 chat thread with that agency, reusing the
--      existing (until now unused) `consulting_messages` table from
--      migration 0001.
--
-- `consulting_messages` already had the right shape, but its RLS had
-- a gap (any authenticated user could insert for any client_id/company
-- by just setting sender_id = auth.uid(), and the read policy only
-- showed a client their OWN sent messages, not the agency's replies).
-- This migration tightens both policies to thread-membership checks,
-- adds a read/update policy, and enables Realtime.
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Let a site visitor create their own lead row (self-service),
-- in addition to the existing staff-only member insert policy.
-- One lead per (company, visitor) — a partial unique index (NULLs
-- from staff-entered clients with no user_id are never considered
-- duplicates) so repeated "Interested" clicks reuse the same lead.
CREATE UNIQUE INDEX IF NOT EXISTS consulting_clients_company_user_unique
  ON consulting_clients (consulting_company_id, user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "cl_self_insert" ON consulting_clients;
CREATE POLICY "cl_self_insert" ON consulting_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Fix consulting_messages RLS: thread-membership based, not
-- sender-identity based, and tie self-serve sends to an owned lead.
DROP POLICY IF EXISTS "mg_read" ON consulting_messages;
CREATE POLICY "mg_read" ON consulting_messages
  FOR SELECT
  USING (
    is_consulting_member(consulting_company_id)
    OR EXISTS (
      SELECT 1 FROM consulting_clients cc
      WHERE cc.id = consulting_messages.client_id
        AND cc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mg_insert" ON consulting_messages;
CREATE POLICY "mg_insert" ON consulting_messages
  FOR INSERT
  WITH CHECK (
    (is_consulting_member(consulting_company_id) AND sender_id = auth.uid())
    OR (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM consulting_clients cc
        WHERE cc.id = consulting_messages.client_id
          AND cc.consulting_company_id = consulting_messages.consulting_company_id
          AND cc.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "mg_update" ON consulting_messages;
CREATE POLICY "mg_update" ON consulting_messages
  FOR UPDATE
  USING (
    is_consulting_member(consulting_company_id)
    OR EXISTS (
      SELECT 1 FROM consulting_clients cc
      WHERE cc.id = consulting_messages.client_id
        AND cc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_consulting_member(consulting_company_id)
    OR EXISTS (
      SELECT 1 FROM consulting_clients cc
      WHERE cc.id = consulting_messages.client_id
        AND cc.user_id = auth.uid()
    )
  );

-- Owner (platform super-admin) visibility, matching the 0020 pattern.
DROP POLICY IF EXISTS "mg_owner_all" ON consulting_messages;
CREATE POLICY "mg_owner_all" ON consulting_messages
  FOR ALL
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- Server-set sender_role, never trust the client for this.
-- (Enforced in application code via dedicated insert helpers; a CHECK
-- constraint keeps it limited to the two valid values.)
ALTER TABLE consulting_messages DROP CONSTRAINT IF EXISTS consulting_messages_sender_role_check;
ALTER TABLE consulting_messages ADD CONSTRAINT consulting_messages_sender_role_check
  CHECK (sender_role IN ('employee', 'client'));

-- 3. Realtime: enable for consulting_messages (mirrors migration 0010's
-- social `messages` table).
ALTER TABLE consulting_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE consulting_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMENT ON TABLE consulting_messages IS
  'Per-client chat thread between an agency and either its staff or the site visitor who owns that consulting_clients row (consulting_clients.user_id = auth.uid()).';
