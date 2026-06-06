-- Durable, tenant-scoped OAuth Dynamic Client Registration clients.

CREATE TABLE IF NOT EXISTS oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  client_name text,
  redirect_uris jsonb NOT NULL,
  grant_types jsonb NOT NULL DEFAULT '["authorization_code"]'::jsonb,
  response_types jsonb NOT NULL DEFAULT '["code"]'::jsonb,
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  disabled_at timestamptz,
  CONSTRAINT oauth_clients_tenant_client_unique UNIQUE (tenant_id, client_id),
  CONSTRAINT oauth_clients_redirect_uris_array CHECK (jsonb_typeof(redirect_uris) = 'array'),
  CONSTRAINT oauth_clients_grant_types_array CHECK (jsonb_typeof(grant_types) = 'array'),
  CONSTRAINT oauth_clients_response_types_array CHECK (jsonb_typeof(response_types) = 'array')
);

CREATE INDEX IF NOT EXISTS oauth_clients_tenant_active_idx
  ON oauth_clients (tenant_id, client_id)
  WHERE disabled_at IS NULL;

-- Down Migration

DROP INDEX IF EXISTS oauth_clients_tenant_active_idx;
DROP TABLE IF EXISTS oauth_clients;
