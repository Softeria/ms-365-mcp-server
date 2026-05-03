# Security Advisories

Last reviewed: 2026-05-03 by daniel@enabi.io.

`npm audit` is run before every release. Each advisory below has been triaged
against Enabi's actual usage (mail/calendar/contacts in stdio mode). Re-review
whenever `npm audit` surfaces something new or when a fix becomes available
without a breaking upgrade.

## Currently accepted risks

| Advisory ID | Package | Severity | Reason for acceptance |
|---|---|---|---|
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | uuid (via @azure/msal-node 3.x) | moderate | Bug only triggers when callers pass a `buf` argument to `uuid.v3/v5/v6()`. We do not call uuid directly — it is a transitive dependency of msal-node, which uses uuid internally without that argument. The fix requires upgrading @azure/msal-node 3.x → 5.x (breaking change). Defer until we plan the msal upgrade. |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | postcss (via styled-components → @redocly/cli) | moderate | Dev-only. @redocly/cli is used to lint the OpenAPI spec at build time. PostCSS only renders trusted CSS shipped inside @redocly/cli's documentation UI. Not reachable at runtime. |
| GHSA-styled-components (transitive postcss) | styled-components (via @redocly/cli) | moderate | Same dev-only path as postcss above. |
| GHSA-redocly-cli (transitive styled-components) | @redocly/cli | moderate | Dev-only OpenAPI tooling. Not shipped to users. Fix requires a major upgrade we have not yet validated. |
| [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p), [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj) | picomatch | high | Dev-only. Pulled in by @redocly/cli, semantic-release, vitest, and eslint for build-time glob matching against developer-controlled patterns. Not reachable at runtime — we never feed user input into glob patterns. |
| [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) | brace-expansion | moderate | Dev-only. Same dependency tree as picomatch — used by glob/minimatch during build, lint, and test. Not reachable at runtime. |

## Resolved

- 2026-05-03 — `npm audit fix` resolved 4 advisories (1 critical, 3 moderate):
  - protobufjs — arbitrary code execution (critical)
  - dompurify — multiple FORBID_TAGS bypasses (moderate)
  - fast-xml-parser — XML/CDATA injection in XMLBuilder (moderate)
  - hono — HTML injection in JSX SSR (moderate)
