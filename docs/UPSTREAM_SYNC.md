# Upstream Sync Runbook

A weekly GitHub Action opens a PR fetching `upstream/main` (`softeria/ms-365-mcp-server`). This document is the human review checklist. The PR never merges itself.

## What the bot does

Every Monday at 06:00 UTC, `.github/workflows/upstream-sync.yml`:

1. Fetches `upstream/main`.
2. Creates a branch `upstream-sync/YYYY-MM-DD`.
3. Merges upstream into the branch (conflicts allowed; bot does not resolve them).
4. Opens a PR titled "Upstream sync YYYY-MM-DD".
5. Posts the capability diff and dependency diff in the PR description.

## Reviewer checklist

Treat this PR like an outside contribution. The PR cannot merge until every check below is satisfied.

### 1. Capability diff

The PR description includes the output of `npm run audit:capabilities`. If it shows ANY change:

- **New tools registered** — read the tool name. If it is mail/calendar/contacts and we want it, add it to `src/enabi-allowlist.ts` and `docs/CAPABILITY_BASELINE.json` in the same PR with a justification. If it is anything else, leave the allowlist alone — the runtime gate will block registration anyway, but you should still understand why upstream added it.
- **New scopes requested** — same logic. If the new scope is required by an already-allowlisted tool, add to baseline. Otherwise reject the change.
- **Tools or scopes removed** — figure out why. Upstream might be deprecating an endpoint. Check Graph API release notes.

If the audit script crashes, the PR is not mergeable until it passes.

### 2. Dependency diff

The PR description includes the diff of `package.json` and `package-lock.json` runtime dependencies.

For each new dependency, check:

- Is it from a known publisher (Microsoft, modelcontextprotocol, Express team, etc.)?
- Does it have recent commits and an active maintainer?
- Run `npm view <pkg>` — note download counts, last publish date.
- Search the npm advisory database for the package name.

For each version bump on an existing dependency:

- Read the changelog. Look for breaking changes, security advisories, or new transport modes.

If anything feels off, ask Daniel before merging.

### 3. Source diff outside our scope

Look at the file list. **Anything outside the trimmed surface is suspicious.** The Enabi-controlled files we expect to see in this PR are:

- `src/graph-tools.ts` (allowlist enforcement)
- `src/auth.ts` (scope filtering)
- `src/server.ts` (HTTP/stdio plumbing)
- `src/secrets.ts` / `src/cloud-config.ts` (config)
- `src/lib/microsoft-auth.ts` (OAuth helpers)
- `src/oauth-provider.ts`, `src/graph-client.ts`, `src/index.ts`, `src/cli.ts`

If the diff touches files we do not use (`src/lib/teams-url-parser.ts`, anything Excel/Files/Tasks/etc related), you can usually accept the change — it is dead code in our fork. But spot-check that it does not introduce a new global side effect on import.

If the diff touches `src/endpoints.json` — **almost always reject those changes**. Our trimmed `endpoints.json` is intentional. Upstream regenerates it from the full Graph spec; merging that diff would re-expand the tool surface. Use `git checkout HEAD -- src/endpoints.json` to revert it inside the sync branch, then re-run `npm run build:client` to regenerate `src/generated/client.ts`.

### 4. Telemetry / external calls

```bash
git diff main...upstream-sync/YYYY-MM-DD -- 'src/**/*.ts' | grep -E "fetch\(|http\.request|new URL\("
```

Every match should be talking to `graph.microsoft.com`, `login.microsoftonline.com`, or `localhost`. Anything else: stop, ask, do not merge.

### 5. New environment variables, new CLI flags

Read `src/cli.ts` and `src/secrets.ts`. New env vars or flags can be vectors for misconfiguration. Update `docs/INSTALL.md` if any need to be set by employees.

### 6. New default behavior

If a new feature is enabled by default and it touches something outside mail/calendar/contacts, disable it explicitly. We prefer secure defaults over upstream defaults.

## What if there are merge conflicts?

The bot will not resolve them. Pull the branch locally:

```bash
git fetch origin
git checkout upstream-sync/YYYY-MM-DD
# resolve conflicts; common ones are in src/graph-tools.ts (our allowlist) and src/auth.ts (our scope filter)
git add .
git commit
git push
```

When in doubt, keep our changes (`git checkout --ours <file>`) and re-apply upstream's improvements manually only if they are valuable.

## Decisions

After the review, choose one:

- **Merge as-is.** Capability diff is empty or only adds something we want. No surprises.
- **Cherry-pick.** Take only specific commits from upstream that we want (security fixes, bug fixes for tools we expose). Open a fresh PR with just those commits and close the sync PR.
- **Skip this sync.** Close the PR. The next weekly run will rebase on the new upstream HEAD. Document why in a closing comment so the next reviewer has context.

## Tagging a release after a successful sync

Employees pin to release tags, not to `main`. After merging an upstream sync (or any change to `main`):

```bash
git tag enabi-v1.X.0
git push origin enabi-v1.X.0
```

Update the install instructions in `docs/INSTALL.md` if the version bump is significant. Most syncs do not require a re-install for employees; the install script always uses the latest tag.

## Safety check summary (the short version)

Before merging any upstream-sync PR, all six must be true:

1. `npm run audit:capabilities` exits 0 OR the baseline change is justified in the PR.
2. `npm run lint && npm run test` pass.
3. No new runtime dependencies you did not vet.
4. No new external HTTP destinations.
5. No new env vars or CLI flags exposing capabilities outside our scope.
6. `src/endpoints.json` is byte-identical to `main` OR every change has been hand-approved.
