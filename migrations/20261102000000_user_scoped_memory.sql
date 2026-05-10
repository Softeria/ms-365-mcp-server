-- Up Migration
-- Add caller-private owner scoping to discovery memory rows.

ALTER TABLE tenant_tool_bookmarks
  ADD COLUMN IF NOT EXISTS owner_subject text;

ALTER TABLE tenant_tool_recipes
  ADD COLUMN IF NOT EXISTS owner_subject text;

ALTER TABLE tenant_facts
  ADD COLUMN IF NOT EXISTS owner_subject text;

ALTER TABLE tenant_tool_bookmarks
  DROP CONSTRAINT IF EXISTS tenant_tool_bookmarks_tenant_id_alias_key;

ALTER TABLE tenant_tool_recipes
  DROP CONSTRAINT IF EXISTS tenant_tool_recipes_tenant_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tool_bookmarks_unique_tenant_alias
  ON tenant_tool_bookmarks (tenant_id, alias)
  WHERE owner_subject IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tool_bookmarks_unique_owner_alias
  ON tenant_tool_bookmarks (tenant_id, owner_subject, alias)
  WHERE owner_subject IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tool_recipes_unique_tenant_name
  ON tenant_tool_recipes (tenant_id, name)
  WHERE owner_subject IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_tool_recipes_unique_owner_name
  ON tenant_tool_recipes (tenant_id, owner_subject, name)
  WHERE owner_subject IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_tool_bookmarks_tenant_owner
  ON tenant_tool_bookmarks (tenant_id, owner_subject);

CREATE INDEX IF NOT EXISTS idx_tenant_tool_recipes_tenant_owner
  ON tenant_tool_recipes (tenant_id, owner_subject);

CREATE INDEX IF NOT EXISTS idx_tenant_facts_tenant_owner
  ON tenant_facts (tenant_id, owner_subject);

-- Down Migration
-- No-op: private memory scoping is additive and existing tenant rows stay valid.
SELECT 1;
