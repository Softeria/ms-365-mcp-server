<purpose>
Lightweight codebase assessment. Spawns a single gsd-codebase-mapper agent for one focus area,
producing targeted documents in `.planning/codebase/`.
</purpose>

<agent_dispatch>
Before spawning any `gsd-*` agent, read `agent_install_mode` from init JSON. If mode is `lazy`, do not use native `Agent(subagent_type="gsd-*")` examples in this workflow; invoke `Skill(skill: "lazy-agent", args: "<agent-id> <task summary>")` instead. Use native `Agent(subagent_type="gsd-*", ...)` only when mode is `native` or `mixed`. Never call `general-purpose` directly for GSD work; `lazy-agent` is the only allowed bridge to `general-purpose`.
</agent_dispatch>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid GSD agent IDs (dispatch using `agent_install_mode` from init JSON):
- If `agent_install_mode` is `lazy`, invoke `Skill(skill: "lazy-agent", args: "<agent-id> <task summary>")`.
- If `agent_install_mode` is `native` or `mixed`, use `Agent(subagent_type="<agent-id>", ...)`.
- Never call `general-purpose` directly for GSD work; only `lazy-agent` uses it internally.
- gsd-codebase-mapper — Maps project structure and dependencies
</available_agent_types>

<process>

## Focus-to-Document Mapping

| Focus | Documents Produced |
|-------|-------------------|
| `tech` | STACK.md, INTEGRATIONS.md |
| `arch` | ARCHITECTURE.md, STRUCTURE.md |
| `quality` | CONVENTIONS.md, TESTING.md |
| `concerns` | CONCERNS.md |
| `tech+arch` | STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md |

## Step 1: Parse arguments and resolve focus

Parse the user's input for `--focus <area>`. Default to `tech+arch` if not specified.

Validate that the focus is one of: `tech`, `arch`, `quality`, `concerns`, `tech+arch`.

If invalid:
```
Unknown focus area: "{input}". Valid options: tech, arch, quality, concerns, tech+arch
```
Exit.

## Step 2: Check for existing documents

```bash
INIT=$(gsd-sdk query init.map-codebase 2>/dev/null || echo "{}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Look up which documents would be produced for the selected focus (from the mapping table above).

For each target document, check if it already exists in `.planning/codebase/`:
```bash
ls -la .planning/codebase/{DOCUMENT}.md 2>/dev/null
```

If any exist, show their modification dates and ask:
```
Existing documents found:
  - STACK.md (modified 2026-04-03)
  - INTEGRATIONS.md (modified 2026-04-01)

Overwrite with fresh scan? [y/N]
```

If user says no, exit.

## Step 3: Create output directory

```bash
mkdir -p .planning/codebase
```

## Step 4: Spawn mapper agent

Spawn a single `gsd-codebase-mapper` agent with the selected focus area:

```
Agent(
  prompt="Scan this codebase with focus: {focus}. Write results to .planning/codebase/. Produce only: {document_list}",
  subagent_type="gsd-codebase-mapper",
  model="{resolved_model}"
)
```

> **ORCHESTRATOR RULE — CODEX RUNTIME**: After calling Agent() above, stop working on this task immediately. Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context. Only resume when the subagent result is available.

## Step 5: Report

```
## Scan Complete

**Focus:** {focus}
**Documents produced:**
{list of documents written with line counts}

Use `/gsd-map-codebase` for a comprehensive 4-area parallel scan.
```

</process>

<success_criteria>
- [ ] Focus area correctly parsed (default: tech+arch)
- [ ] Existing documents detected with modification dates shown
- [ ] User prompted before overwriting
- [ ] Single mapper agent spawned with correct focus
- [ ] Output documents written to .planning/codebase/
</success_criteria>
