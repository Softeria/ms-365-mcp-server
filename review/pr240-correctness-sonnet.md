---
model: anthropic/claude-sonnet-4-6
focus: correctness + security
commit: 33fdeda (committed) + uncommitted auth.ts / auth-tools.ts changes
project: Softeria/ms-365-mcp-server
reviewed_at: 2026-02-27T11:00:00Z
---

# PR #240 — Multi-Account Support: Correctness + Security Review

## ACCESS: VERIFIED
- Repo: `/Users/zenosartori/ms-365-mcp-server`
- Branch: `feat/multi-account-support-clean`
- Both committed diff (`git diff upstream/main..HEAD`) and uncommitted diff (`git diff`) reviewed
- Key files read in full: `src/auth.ts`, `src/auth-tools.ts`, `src/graph-tools.ts`, `src/server.ts`, `test/multi-account.test.ts`

---

## Blocker

None.

---

## Risk

### R1 — `removeAccount` MSAL failure returns misleading "Account not found"

**File:** `src/auth-tools.ts:200-207`

When `msalApp.getTokenCache().removeAccount(account)` throws internally, `auth.ts:removeAccount()` catches it and returns `false` (line 562). The `auth-tools.ts` handler then falls into the `else` branch:

```typescript
} else {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: `Account not found: ${account}` }) }]
  };
}
```

But at this point the account **was** found (it passed `resolveAccount()`). The failure is an MSAL cache removal error, not a lookup failure. The LLM receives "Account not found: user@outlook.com" for a cache I/O error — an incorrect error message that would mislead both LLM and user.

**Why it matters:** An LLM attempting to remove an account that's locked or in a corrupt state would retry indefinitely thinking it misidentified the account.

**Proof:** `src/auth.ts:544-563` (grep "removeAccount" src/auth.ts), `src/auth-tools.ts:200-207`

- **Class:** `contract-drift`
- **Escape:** The refactor changed `resolveAccount()` to throw on not-found, making the `else` branch's message stale. The false-return case now means MSAL failure, not lookup failure.
- **Reinforcement:** Add `isError: true` to the else branch and change the message to "Failed to remove account (cache error)" — or better, propagate the underlying error from MSAL. Add a test that mocks `authManager.removeAccount` to resolve `false` and asserts the error message is not "Account not found".
- **Proof:** `grep -n "return false" src/auth.ts` → line 562 is the only remaining path that produces `false`; it's reached only from the MSAL catch block, not the lookup path.

---

### R2 — Dead `else` branch in `selectAccount` tool handler

**File:** `src/auth-tools.ts:157-165`

After the refactor, `authManager.selectAccount(identifier)` either:
- Returns `true` (always, when `resolveAccount()` succeeds), or
- Throws (when `resolveAccount()` throws on not-found)

The `else { error: 'Account not found: ${account}' }` branch (lines 157-165) is **permanently unreachable**. The actual not-found error is caught by the `catch(error)` block and returned as `"Failed to select account: Account '...' not found. Available accounts: ..."` — which is a better message anyway.

Dead code risks: future callers extending `selectAccount()` to return `false` for new reasons would silently emit a misleading error. TypeScript won't warn because the `Promise<boolean>` type still allows it.

**Proof:** `src/auth.ts:530-542` — `selectAccount()` returns `true` or throws (no `return false`). `grep -n "return false\|return true" src/auth.ts` confirms: line 541=`true`, line 559=`true`, line 562=`false` (removeAccount only).

- **Class:** `contract-drift`
- **Escape:** The uncommitted fix correctly calls `resolveAccount()` which throws, but the auth-tools.ts `else` branch was not cleaned up to match the new semantics.
- **Reinforcement:** Remove the dead `else` branch or convert it to an assertion (`throw new Error("Invariant: selectAccount should never return false")`). Add a test for the not-found path through select-account that verifies the error comes from the `catch` block.
- **Proof:** `grep -n "return false" src/auth.ts` → 0 results in `selectAccount()` path; only in `removeAccount()`'s MSAL catch block.

---

### R3 — Double MSAL cache fetch in `getTokenForAccount()` when identifier is provided

**File:** `src/auth.ts:634` + `src/auth.ts:583`

When `identifier` is provided, `getTokenForAccount()` calls `getAllAccounts()` twice:
1. Line 634: `const accounts = await this.msalApp.getTokenCache().getAllAccounts()` — used only for the `accounts.length === 0` guard.
2. Line 643: `targetAccount = await this.resolveAccount(identifier)` → internally calls `getAllAccounts()` again at line 583.

The first fetch result is then **discarded** and the identifier branch doesn't use it at all. No TOCTOU risk in Node.js's single-threaded runtime, but it's a wasted allocation on the hot path (every tool call in multi-account mode).

**Proof:** `src/auth.ts:629-665` (read full `getTokenForAccount` body).

- **Class:** `state-concurrency` (minor — no race, just wasteful)
- **Escape:** The empty-accounts guard was added before `resolveAccount()` was extracted; the guard now duplicates work done by `resolveAccount()`.
- **Reinforcement:** Refactor `getTokenForAccount()` to call `resolveAccount()` via a shared accounts array, or move the empty-check into `resolveAccount()` itself (it currently does throw on not-found anyway). A unit test asserting `getAllAccounts()` is called exactly once per `getTokenForAccount()` invocation would catch this.
- **Proof:** `grep -c "getAllAccounts" src/auth.ts` → 6 hits; two within `getTokenForAccount` body (lines 634 and 583 via resolveAccount).

---

### R4 — `homeAccountId` exposed in error messages when account has no `username`

**Files:** `src/auth.ts:599`, `src/auth.ts:657`

Both `resolveAccount()` and `getTokenForAccount()` construct the available-accounts list as:
```typescript
accounts.map((a: AccountInfo) => a.username || a.homeAccountId).join(', ')
```

If `a.username` is `undefined` or empty string (possible for guest accounts, service accounts, or partially-formed MSAL cache entries), `homeAccountId` is emitted in the MCP tool response. The `homeAccountId` format is `{objectId}.{tenantId}` — exposing both the Azure AD tenant ID and user OID to the LLM client.

This is lower severity than it sounds (the LLM already has authenticated access), but the previous commit explicitly removed `homeAccountId` from `list-accounts` for minimization. The error paths now reintroduce it conditionally.

**Proof:** `src/auth.ts:599` — `grep "username || a.homeAccountId" src/auth.ts`

- **Class:** `security-permissions`
- **Escape:** The data minimization fix (commit `183fbc4`) only addressed `list-accounts` response shape, not error message construction in `resolveAccount()` / `getTokenForAccount()`.
- **Reinforcement:** Change the fallback to `a.name || 'unknown'` or filter out entries with no username before listing. Add a test with an account that has `username: ''` and assert `homeAccountId` is not present in the error message.
- **Proof:** Existing `list-accounts` response shape test verifies `homeAccountId` absent from success path (`test/multi-account.test.ts:156-157`), but no test covers error message content.

---

### R5 — No test for `resolveAccount()` core logic

**File:** `test/multi-account.test.ts`

`resolveAccount()` is the extracted helper used by `selectAccount()`, `removeAccount()`, and `getTokenForAccount()`. It has zero direct unit tests. The only coverage is indirect via the `list-accounts` response shape test (which never exercises `resolveAccount()`). Missing test cases:

- Email match (case-insensitive) vs exact case
- `homeAccountId` fallback when no email match
- Not-found → throw with available accounts listed
- Account with empty `username` (homeAccountId fallback path)

**Proof:** `grep -n "resolveAccount" test/multi-account.test.ts` → 0 results. `grep -rn "resolveAccount" test/` → 0 results.

- **Class:** `test-coverage-gap`
- **Escape:** The refactor extracted `resolveAccount()` from existing inline logic but the tests tested the old callers (`selectAccount`/`removeAccount`) at the tool level, not the helper.
- **Reinforcement:** Add unit tests for `resolveAccount()` directly on the `AuthManager` class. Use a mock MSAL app.
- **Proof:** `npx vitest run test/multi-account.test.ts` — none of the 4 suite entries reference `resolveAccount`.

---

## Ok

### O1 — `resolveAccount()` deduplication is correct
Resolution order (email case-insensitive → homeAccountId exact → throw) is identical in the extracted helper and properly replaces the duplicated inline logic that was in `selectAccount()` and the inline block in `getTokenForAccount()`. Behavior is strictly identical. Clean extraction.
`Proof: src/auth.ts:582-606`

### O2 — `getTokenForAccount()` no-identifier path is safe
- 0 accounts → throw "No accounts found. Please login first." ✓
- 1 account → auto-select `accounts[0]` ✓
- Multiple + `selectedAccountId` → resolve by selected ✓
- Multiple + no selection → throw with detailed helpful message listing available accounts ✓

No implicit `accounts[0]` fallback for multi-account scenario. The comment at line 649-650 explicitly guards against this. Safe.
`Proof: src/auth.ts:644-664`

### O3 — Token redaction in logs is correct
Graph request options have `accessToken` stripped before logging:
```typescript
const { accessToken: _redacted, ...safeOptions } = options;
logger.info(`... ${JSON.stringify(safeOptions)}${_redacted ? ' [accessToken=REDACTED]' : ''}`);
```
Redaction is unconditional when `accessToken` is present. No leakage path found.
`Proof: src/graph-tools.ts` (committed diff, log line before `graphClient.graphRequest`)

### O4 — OAuth mode is correctly bypassed at both layers
Layer 1 (executeGraphTool): `if (authManager && !authManager.isOAuthModeEnabled())` — skips MSAL account resolution entirely.
Layer 2 (getTokenForAccount): `if (this.isOAuthMode && this.oauthToken) return this.oauthToken` — short-circuits before any MSAL access.
Double defense. Neither path has a bypass vulnerability.
`Proof: src/graph-tools.ts:99`, `src/auth.ts:630-632`

### O5 — Contract consistency: list-accounts → select-account/remove-account
- `list-accounts` returns `{ email, name, isDefault }` — no `id` or `homeAccountId` ✓
- `list-accounts` tip: *"Pass the 'email' value as the 'account' parameter"* ✓
- `select-account` and `remove-account` accept `account` (email or homeAccountId) ✓
- `resolveAccount()` tries email first, homeAccountId second ✓

The LLM can call `list-accounts`, read an `email`, pass it to `select-account`/`remove-account` without needing to know MSAL internals. Contract is coherent.

### O6 — `list-accounts` homeAccountId correctly excluded from response
The committed fix (commit `183fbc4`) changed the response shape from:
```typescript
{ id: account.homeAccountId, username, name, selected }
```
to:
```typescript
{ email: account.username || 'unknown', name, isDefault }
```
`homeAccountId` is absent. Test confirms this (`test/multi-account.test.ts:156-157`).

### O7 — `select-account` tool schema now accepts email
Uncommitted change renames `accountId` → `account` and updates the description to "Email address or account ID". This matches what `list-accounts` instructs the LLM to pass. The tool implementation correctly calls `authManager.selectAccount(account)` → `resolveAccount(account)` which handles both email and homeAccountId.

### O8 — No duplicate `list-accounts` registration
`registerGraphTools` and `registerDiscoveryTools` explicitly do **not** register `list-accounts` (comments confirm canonical ownership is `registerAuthTools`). Test `test/multi-account.test.ts:96-118` verifies exactly 1 registration when both run together.

### O9 — `multiAccount` detection happens before `createMcpServer()` in `server.ts`
`initialize()` detects multi-account mode (line 108) and populates `this.accountNames` (line 111) **before** `createMcpServer()` is called (line 126). Schemas are built with correct account hints at startup.
`Proof: src/server.ts:102-127`

---

## Questions

**Q1 — HTTP mode + multiAccount:**
In HTTP mode (stateless per-request), `this.multiAccount` is determined at startup from the MSAL cache state at that moment. If an account is added via `--login` after the HTTP server starts, `isMultiAccount()` is stale and the `account` parameter won't be injected into new connection schemas (since `createMcpServer()` is called per-request using the cached `this.multiAccount`). Is this intentional? The `list-accounts` tool will reflect the new account correctly (it calls MSAL directly), but the schema hint won't. Is there a plan to handle runtime account additions in HTTP mode?

**Q2 — `authManager` not passed to `registerAuthTools` in HTTP mode:**
In `server.ts:72-75`, auth tools are conditionally registered based on `shouldRegisterAuthTools`. In HTTP mode without `--enable-auth-tools`, `registerAuthTools` is skipped entirely — which means `list-accounts` is also not registered. Is this intentional? In multi-account HTTP mode, the LLM has no way to discover accounts via `list-accounts`. The schema hints (known at startup) are the only discovery mechanism.

**Q3 — `acquireTokenByDeviceCode` auto-selects new account only if no account is currently selected (line 415):**
```typescript
if (!this.selectedAccountId && response?.account) {
  this.selectedAccountId = response.account.homeAccountId;
```
When a second account is added via `--login`, `selectedAccountId` is already set (from the first login), so the second account is NOT auto-selected. This is correct for multi-account. But the server process is typically restarted between logins per the README. If users add accounts without restarting, `isMultiAccount()` returns true after the second login, but schema hints are already registered with only 1 account. Is there a mechanism to trigger schema re-registration or notify the LLM that it should re-query `list-accounts`?

**Q4 — Discovery mode and `account` parameter:**
In discovery mode, `execute-tool` accepts `parameters: z.record(z.any())` (freeform). An `account` key within `parameters` will be passed to `executeGraphTool()` and will work. But the schema gives no hint that `account` is a valid key. Is this acceptable for discovery mode, or should the `execute-tool` parameters schema inject a top-level `account` field similar to non-discovery mode?
