// Tests register synthetic tool aliases that aren't on the production
// Enabi allowlist (e.g. "test-tool", placeholder Excel/Teams tools used to
// exercise registration logic). Bypass the allowlist for tests only — see
// isAllowed() in src/enabi-allowlist.ts.
process.env.ENABI_ALLOWLIST_BYPASS = '1';

// Enabi's cloud-config refuses to start without MS365_MCP_CLIENT_ID. Tests that
// exercise AuthManager.create() need a placeholder; production still requires
// the real value set in the environment.
process.env.MS365_MCP_CLIENT_ID = process.env.MS365_MCP_CLIENT_ID ?? 'test-client-id';

// Node 18 lacks the Web `File` global that Node 20+ and browsers provide.
// The generated Graph client uses `z.instanceof(File)` for multipart upload
// endpoints, so importing it under Node 18 throws ReferenceError at module load.
// Provide a minimal stand-in so tests that load the real client can run on 18.
if (typeof (globalThis as { File?: unknown }).File === 'undefined') {
  (globalThis as { File?: unknown }).File = class File {};
}
