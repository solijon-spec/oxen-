-- ============================================================
-- Migration 0023: Owner CRM — Sales Pipeline (Odoo-style)
--
-- Platform-level CRM for the OXEN owners: track sales leads
-- (prospective agencies / partners / clients) through a pipeline
-- of stages, with activities (calls, meetings, tasks, notes)
-- attached to each lead. Separate from consulting_clients, which
-- is each agency's own client pipeline.
--
-- Access is restricted to owners only via is_owner() (already
-- defined by migration 0005_owner_admin.sql).
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Leads table
CREATE TABLE IF NOT EXISTS owner_crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'contacted', 'qualified', 'proposition', 'won', 'lost')),
  expected_value NUMERIC(12, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  probability INTEGER NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  assigned_owner_email TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  lost_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_crm_leads_stage ON owner_crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_owner_crm_leads_created_at ON owner_crm_leads(created_at DESC);

ALTER TABLE owner_crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_crm_leads_select ON owner_crm_leads FOR SELECT
  TO authenticated USING (is_owner());

CREATE POLICY owner_crm_leads_insert ON owner_crm_leads FOR INSERT
  TO authenticated WITH CHECK (is_owner());

CREATE POLICY owner_crm_leads_update ON owner_crm_leads FOR UPDATE
  TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY owner_crm_leads_delete ON owner_crm_leads FOR DELETE
  TO authenticated USING (is_owner());

-- 2. Activities table (calls, meetings, tasks, notes per lead)
CREATE TABLE IF NOT EXISTS owner_crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES owner_crm_leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('call', 'meeting', 'email', 'task', 'note')),
  title TEXT NOT NULL,
  body TEXT,
  due_date TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_crm_activities_lead_id ON owner_crm_activities(lead_id);

ALTER TABLE owner_crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_crm_activities_select ON owner_crm_activities FOR SELECT
  TO authenticated USING (is_owner());

CREATE POLICY owner_crm_activities_insert ON owner_crm_activities FOR INSERT
  TO authenticated WITH CHECK (is_owner());

CREATE POLICY owner_crm_activities_update ON owner_crm_activities FOR UPDATE
  TO authenticated USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY owner_crm_activities_delete ON owner_crm_activities FOR DELETE
  TO authenticated USING (is_owner());

COMMENT ON TABLE owner_crm_leads IS
  'Owner-only platform sales pipeline (Odoo CRM style): prospective agencies/partners tracked from new lead to won/lost.';
COMMENT ON TABLE owner_crm_activities IS
  'Calls, meetings, tasks and notes attached to an owner_crm_leads row.';
