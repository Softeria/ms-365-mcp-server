# Planner Dynamic Key Schema Issue

This template outlines the issue with dynamic key schema handling in Planner.

(response = requests.patch(url, headers=headers, json=body))

- This issue was discovered while implementing project management automation for a consulting firm using Jana 2.0 AI assistant with Open Web UI + MCP gateway
- The MCP tools work perfectly for Planner **read operations** and for write operations using **fixed-schema fields** (title, dueDateTime, percentComplete, etc.)
- The issue specifically affects fields where Graph API requires dynamic object keys
- A new regression test has been created to prevent future schema regressions; see `node-tests/schema-passthrough.test.ts` in our fork. It iterates over all generated body schemas and asserts that object-like types accept extra properties.

---

**Would you accept a PR for this fix?** We're happy to contribute the schema changes if you can point us to the relevant schema definition files in the repository.  When submitting a pull request, please include the above regression test so maintainers can verify correctness automatically.

For maintainers, keep an eye on the code generator: record schemas must include `.passthrough()` or equivalent `additionalProperties` handling. The test will catch omissions.
