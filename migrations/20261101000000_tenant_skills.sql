-- Up Migration
-- Plan 08-05: tenant-scoped editable skills surfaced as MCP prompts.
--
-- Additive only. Skills are tenant-owned rows and may be tenant-visible,
-- user-visible, admin-visible, or editable copies of bundled read-only prompts.

CREATE TABLE IF NOT EXISTS tenant_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_subject text,
  name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb,
  body text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'tenant',
  source text NOT NULL DEFAULT 'custom',
  source_skill_name text,
  version integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_skills_visibility_check
    CHECK (visibility IN ('tenant', 'user', 'admin', 'builtin-copy')),
  CONSTRAINT tenant_skills_source_check
    CHECK (source IN ('builtin', 'fork', 'custom', 'import')),
  CONSTRAINT tenant_skills_version_check
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_skills_unique_tenant_name
  ON tenant_skills (tenant_id, name)
  WHERE owner_subject IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_skills_unique_owner_name
  ON tenant_skills (tenant_id, owner_subject, name)
  WHERE owner_subject IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_skills_tenant_enabled
  ON tenant_skills (tenant_id, enabled);

CREATE INDEX IF NOT EXISTS idx_tenant_skills_tenant_visibility
  ON tenant_skills (tenant_id, visibility);

CREATE INDEX IF NOT EXISTS idx_tenant_skills_tenant_owner
  ON tenant_skills (tenant_id, owner_subject);

-- Down Migration
-- No-op: this phase requires additive-only schema changes.
SELECT 1;
