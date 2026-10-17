-- ============================================================
-- Migration 0026: Monthly KPI targets (per employee + per tour type)
--
-- Lets an agency admin set a monthly sales target in Settings,
-- either for a specific employee (e.g. a manager's sales quota)
-- or for a tour/destination type (e.g. "Germany" packages). The
-- CRM dashboard (Analytics) compares these targets against actual
-- POS sales for the same period to show progress.
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS consulting_kpi_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulting_company_id UUID NOT NULL REFERENCES consulting_companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- 'YYYY-MM'
  target_type TEXT NOT NULL CHECK (target_type IN ('employee', 'tour_type')),
  employee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_type TEXT,
  target_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  target_count INTEGER,
  currency TEXT NOT NULL DEFAULT 'UZS',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (target_type = 'employee' AND employee_id IS NOT NULL AND tour_type IS NULL)
    OR (target_type = 'tour_type' AND tour_type IS NOT NULL AND employee_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_kpi_targets_company_period ON consulting_kpi_targets(consulting_company_id, period);

ALTER TABLE consulting_kpi_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_member_read ON consulting_kpi_targets FOR SELECT
  USING (is_consulting_member(consulting_company_id));

CREATE POLICY kpi_owner_read ON consulting_kpi_targets FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY kpi_admin_insert ON consulting_kpi_targets FOR INSERT
  TO authenticated WITH CHECK (
    is_consulting_admin(consulting_company_id)
    OR EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY kpi_admin_update ON consulting_kpi_targets FOR UPDATE
  TO authenticated USING (
    is_consulting_admin(consulting_company_id)
    OR EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY kpi_admin_delete ON consulting_kpi_targets FOR DELETE
  TO authenticated USING (
    is_consulting_admin(consulting_company_id)
    OR EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY kpi_platform_owner_all ON consulting_kpi_targets FOR ALL
  TO authenticated USING (is_owner()) WITH CHECK (is_owner());

COMMENT ON TABLE consulting_kpi_targets IS
  'Monthly sales targets an agency admin sets per employee or per tour/destination type, compared against actual POS sales in Analytics.';
