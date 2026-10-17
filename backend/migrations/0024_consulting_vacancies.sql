-- ============================================================
-- Migration 0024: Consulting Vacancies + Applications ("Workers" CRM)
--
-- Lets a consulting agency post job vacancies from its own CRM
-- dashboard. Published vacancies are visible publicly (no login)
-- on /jobs and on the agency's public profile. Anyone (anonymous
-- or signed in) can submit an application for a published vacancy
-- — applications then feed a new "Workers" CRM pipeline inside the
-- agency dashboard (New -> Screening -> Interview -> Offer ->
-- Hired/Rejected), mirroring the sales CRM pipeline.
--
-- RLS mirrors the dual pattern already used for consulting_posts
-- (migration 0001 is_consulting_member() + migration 0016 owner_id
-- direct-check fallback), plus owner-admin impersonation access
-- (migration 0020 pattern).
--
-- IMPORTANT: Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Vacancies table
CREATE TABLE IF NOT EXISTS consulting_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulting_company_id UUID NOT NULL REFERENCES consulting_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'remote', 'internship', 'contract')),
  experience_level TEXT NOT NULL DEFAULT 'any'
    CHECK (experience_level IN ('no_experience', 'junior', 'mid', 'senior', 'any')),
  location_city TEXT,
  location_country TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  responsibilities TEXT,
  benefits TEXT,
  salary_min NUMERIC(12, 2),
  salary_max NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'UZS',
  salary_is_negotiable BOOLEAN NOT NULL DEFAULT false,
  openings_count INTEGER NOT NULL DEFAULT 1 CHECK (openings_count > 0),
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
  expires_at TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consulting_vacancies_company_id ON consulting_vacancies(consulting_company_id);
CREATE INDEX IF NOT EXISTS idx_consulting_vacancies_status ON consulting_vacancies(status);
CREATE INDEX IF NOT EXISTS idx_consulting_vacancies_created_at ON consulting_vacancies(created_at DESC);

ALTER TABLE consulting_vacancies ENABLE ROW LEVEL SECURITY;

-- Member-based access (migration 0001 pattern)
CREATE POLICY vac_member_read ON consulting_vacancies FOR SELECT
  USING (is_consulting_member(consulting_company_id) OR status = 'published');

CREATE POLICY vac_member_insert ON consulting_vacancies FOR INSERT
  TO authenticated WITH CHECK (is_consulting_member(consulting_company_id));

CREATE POLICY vac_member_update ON consulting_vacancies FOR UPDATE
  TO authenticated USING (is_consulting_member(consulting_company_id));

CREATE POLICY vac_member_delete ON consulting_vacancies FOR DELETE
  TO authenticated USING (is_consulting_admin(consulting_company_id));

-- Owner-direct fallback (migration 0016 pattern — works without consulting_members rows)
CREATE POLICY vac_owner_read ON consulting_vacancies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
    OR status = 'published'
  );

CREATE POLICY vac_owner_insert ON consulting_vacancies FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY vac_owner_update ON consulting_vacancies FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY vac_owner_delete ON consulting_vacancies FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

-- Platform OWNER impersonation access (migration 0020 pattern)
CREATE POLICY vac_platform_owner_all ON consulting_vacancies FOR ALL
  TO authenticated USING (is_owner()) WITH CHECK (is_owner());

-- 2. Applications table ("Workers" CRM pipeline)
CREATE TABLE IF NOT EXISTS consulting_vacancy_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES consulting_vacancies(id) ON DELETE CASCADE,
  consulting_company_id UUID NOT NULL REFERENCES consulting_companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_url TEXT,
  cover_note TEXT,
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  source TEXT NOT NULL DEFAULT 'website',
  applicant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacancy_apps_vacancy_id ON consulting_vacancy_applications(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_apps_company_id ON consulting_vacancy_applications(consulting_company_id);
CREATE INDEX IF NOT EXISTS idx_vacancy_apps_stage ON consulting_vacancy_applications(stage);

ALTER TABLE consulting_vacancy_applications ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous applicants) can apply to a PUBLISHED vacancy.
-- The consulting_company_id must match the vacancy's own company (prevents
-- spoofing an application into the wrong agency's pipeline).
CREATE POLICY vac_app_public_insert ON consulting_vacancy_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consulting_vacancies v
      WHERE v.id = vacancy_id
        AND v.consulting_company_id = consulting_vacancy_applications.consulting_company_id
        AND v.status = 'published'
    )
  );

-- Only the agency's own members/owner (or the platform owner) can read applications —
-- never public, and never other agencies.
CREATE POLICY vac_app_member_read ON consulting_vacancy_applications FOR SELECT
  TO authenticated USING (is_consulting_member(consulting_company_id) OR is_owner());

CREATE POLICY vac_app_owner_read ON consulting_vacancy_applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY vac_app_member_update ON consulting_vacancy_applications FOR UPDATE
  TO authenticated USING (is_consulting_member(consulting_company_id) OR is_owner());

CREATE POLICY vac_app_owner_update ON consulting_vacancy_applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM consulting_companies c WHERE c.id = consulting_company_id AND c.owner_id = auth.uid())
  );

CREATE POLICY vac_app_admin_delete ON consulting_vacancy_applications FOR DELETE
  TO authenticated USING (is_consulting_admin(consulting_company_id) OR is_owner());

-- 3. View counter RPC (anonymous-safe, mirrors increment_post_views)
CREATE OR REPLACE FUNCTION increment_vacancy_views(p_vacancy_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE consulting_vacancies SET views = views + 1 WHERE id = p_vacancy_id AND status = 'published';
$$;

COMMENT ON TABLE consulting_vacancies IS
  'Job postings an agency publishes from its own CRM. Published rows are publicly visible on /jobs and the agency public profile.';
COMMENT ON TABLE consulting_vacancy_applications IS
  'Candidate applications submitted (anonymously or signed in) against a published vacancy. Feeds the agency''s "Workers" CRM pipeline.';
