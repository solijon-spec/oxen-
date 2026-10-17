-- ============================================================
-- Migration 0020: Owner Agency CRM Access
--
-- Allows OXEN platform owners to manage any agency's CRM
-- (tour packages, posts, etc.) without needing the agency
-- owner's credentials. Uses the existing is_owner() RLS
-- function for authorization.
--
-- Also creates the owner_agency_audit_logs table to track
-- every owner action performed inside an agency CRM.
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Owner Agency Audit Logs table
-- Tracks every action an owner performs while managing an agency CRM.
CREATE TABLE IF NOT EXISTS owner_agency_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_email TEXT,
  agency_id UUID NOT NULL REFERENCES consulting_companies(id) ON DELETE CASCADE,
  agency_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by agency
CREATE INDEX IF NOT EXISTS idx_owner_agency_audit_logs_agency_id
  ON owner_agency_audit_logs(agency_id);

-- Index for querying by owner
CREATE INDEX IF NOT EXISTS idx_owner_agency_audit_logs_owner_user_id
  ON owner_agency_audit_logs(owner_user_id);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_owner_agency_audit_logs_created_at
  ON owner_agency_audit_logs(created_at DESC);

-- 2. RLS for owner_agency_audit_logs
ALTER TABLE owner_agency_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owners can insert audit log entries
CREATE POLICY owner_agency_audit_logs_insert
  ON owner_agency_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

-- Only owners can read audit log entries
CREATE POLICY owner_agency_audit_logs_select
  ON owner_agency_audit_logs FOR SELECT
  TO authenticated
  USING (is_owner());

-- No UPDATE or DELETE — audit logs are append-only (tamper-evident)
-- (No policies for UPDATE/DELETE means RLS blocks them by default.)

-- 3. RLS policy additions: allow OWNER to manage consulting_posts
-- for ANY agency (not just their own).
-- The existing policy allows: consulting_companies.owner_id = auth.uid()
-- This adds: OR is_owner()

-- consulting_posts: allow owner INSERT
CREATE POLICY consulting_posts_owner_insert
  ON consulting_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consulting_companies
      WHERE consulting_companies.id = consulting_posts.consulting_company_id
    ) OR is_owner()
  );

-- consulting_posts: allow owner UPDATE
CREATE POLICY consulting_posts_owner_update
  ON consulting_posts FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- consulting_posts: allow owner DELETE
CREATE POLICY consulting_posts_owner_delete
  ON consulting_posts FOR DELETE
  TO authenticated
  USING (is_owner());

-- 4. RLS policy additions: allow OWNER to manage consulting_packages
-- for ANY agency.
CREATE POLICY consulting_packages_owner_insert
  ON consulting_packages FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY consulting_packages_owner_update
  ON consulting_packages FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

CREATE POLICY consulting_packages_owner_delete
  ON consulting_packages FOR DELETE
  TO authenticated
  USING (is_owner());

-- 5. RLS: allow OWNER to read consulting_companies (all fields)
-- The existing owner panel already has RLS for this via is_owner(),
-- but we add an explicit SELECT policy if not already present.
CREATE POLICY consulting_companies_owner_select
  ON consulting_companies FOR SELECT
  TO authenticated
  USING (is_owner());

-- 6. RLS: allow OWNER to update consulting_companies
-- (for profile edits, subscription changes, etc.)
CREATE POLICY consulting_companies_owner_update
  ON consulting_companies FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

-- 7. RLS: allow OWNER to read consulting_members (for employee lists)
CREATE POLICY consulting_members_owner_select
  ON consulting_members FOR SELECT
  TO authenticated
  USING (is_owner());

-- 8. RLS: allow OWNER to read/write consulting_activity_logs
CREATE POLICY consulting_activity_logs_owner_select
  ON consulting_activity_logs FOR SELECT
  TO authenticated
  USING (is_owner());

CREATE POLICY consulting_activity_logs_owner_insert
  ON consulting_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

-- 9. RLS: allow OWNER to read consulting_clients + consulting_applications
CREATE POLICY consulting_clients_owner_select
  ON consulting_clients FOR SELECT
  TO authenticated
  USING (is_owner());

CREATE POLICY consulting_applications_owner_select
  ON consulting_applications FOR SELECT
  TO authenticated
  USING (is_owner());

-- 10. RLS: allow OWNER to read consulting_payments
CREATE POLICY consulting_payments_owner_select
  ON consulting_payments FOR SELECT
  TO authenticated
  USING (is_owner());

-- 11. RLS: allow OWNER to read/write services (for package management)
CREATE POLICY services_owner_select
  ON services FOR SELECT
  TO authenticated
  USING (is_owner());

CREATE POLICY services_owner_insert
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY services_owner_update
  ON services FOR UPDATE
  TO authenticated
  USING (is_owner())
  WITH CHECK (is_owner());

CREATE POLICY services_owner_delete
  ON services FOR DELETE
  TO authenticated
  USING (is_owner());

-- 12. RLS: allow OWNER to read consulting_package_media
CREATE POLICY consulting_package_media_owner_select
  ON consulting_package_media FOR SELECT
  TO authenticated
  USING (is_owner());

CREATE POLICY consulting_package_media_owner_insert
  ON consulting_package_media FOR INSERT
  TO authenticated
  WITH CHECK (is_owner());

CREATE POLICY consulting_package_media_owner_delete
  ON consulting_package_media FOR DELETE
  TO authenticated
  USING (is_owner());

-- 13. Comment
COMMENT ON TABLE owner_agency_audit_logs IS
  'Append-only audit log for owner actions performed inside agency CRMs. Only owners can read/write.';
