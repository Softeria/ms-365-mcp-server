<agent_dispatch>
Before spawning any `gsd-*` agent, read `agent_install_mode` from init JSON. If mode is `lazy`, do not use native `Agent(subagent_type="gsd-*")` examples in this workflow; invoke `Skill(skill: "lazy-agent", args: "<agent-id> <task summary>")` instead. Use native `Agent(subagent_type="gsd-*", ...)` only when mode is `native` or `mixed`. Never call `general-purpose` directly for GSD work; `lazy-agent` is the only allowed bridge to `general-purpose`.
</agent_dispatch>

# Model Profile Resolution

Resolve model profile once at the start of orchestration, then use it for all Task spawns.

## Resolution Pattern

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default: `balanced` if not set or config missing.

## Lookup Table

@${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/get-shit-done/references/model-profiles.md

Look up the agent in the table for the resolved profile. Pass the model parameter to Task calls:

```
Task(
  prompt="...",
  subagent_type="gsd-planner",
  model="{resolved_model}"  # "inherit", "sonnet", or "haiku"
)
```

**Note:** Opus-tier agents resolve to `"inherit"` (not `"opus"`). This causes the agent to use the parent session's model, avoiding conflicts with organization policies that may block specific opus versions.

If `model_profile` is `"adaptive"`, agents resolve to role-based assignments (opus/sonnet/haiku based on agent type).

If `model_profile` is `"inherit"`, all agents resolve to `"inherit"` (useful for OpenCode `/model`).

## Usage

1. Resolve once at orchestration start
2. Store the profile value
3. Look up each agent's model from the table when spawning
4. Pass model parameter to each Task call (values: `"inherit"`, `"sonnet"`, `"haiku"`)
