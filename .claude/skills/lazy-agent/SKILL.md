---
name: lazy-agent
description: Spawn a custom GSD subagent on demand without loading its full definition into coordinator context. Args = "<agent-id> <task description>".
allowed-tools: Agent, Bash, Glob
---

# Lazy Agent Loader

Custom GSD subagents live in `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/agents/` instead of `~/.claude/agents/` so Claude Code does not eagerly load them.

Critical context rule: coordinator must not read the full lazy agent file. The child agent reads its own definition.

## Args format

```text
/lazy-agent <agent-id> <task description>
```

Example:

```text
/lazy-agent gsd-planner Plan the auth refactor phase
```

If `<agent-id>` is omitted or `--list`, print the compact index and stop.

## Compact index

| ID | Purpose |
|----|---------|
| gsd-advisor-researcher | Researches one gray-area decision. |
| gsd-ai-researcher | Researches AI framework docs and writes AI guidance. |
| gsd-assumptions-analyzer | Analyzes codebase assumptions with evidence. |
| gsd-codebase-mapper | Maps codebase structure and dependencies. |
| gsd-code-fixer | Applies fixes from review artifacts. |
| gsd-code-reviewer | Reviews bugs, security, and quality. |
| gsd-debugger | Investigates bugs with scientific-method checkpoints. |
| gsd-debug-session-manager | Manages multi-cycle debug loop. |
| gsd-doc-classifier | Classifies planning docs. |
| gsd-doc-synthesizer | Synthesizes classified docs. |
| gsd-doc-verifier | Verifies doc claims against codebase. |
| gsd-doc-writer | Writes project documentation. |
| gsd-domain-researcher | Researches business domain context. |
| gsd-eval-auditor | Audits AI eval coverage. |
| gsd-eval-planner | Designs eval strategy. |
| gsd-executor | Executes GSD plans, commits, and summaries. |
| gsd-framework-selector | Compares AI/LLM frameworks. |
| gsd-integration-checker | Checks cross-phase integration. |
| gsd-intel-updater | Writes structured intel files. |
| gsd-nyquist-auditor | Validates verification coverage. |
| gsd-pattern-mapper | Maps new files to closest analogs. |
| gsd-phase-researcher | Researches phase implementation. |
| gsd-plan-checker | Reviews plan quality. |
| gsd-planner | Creates executable phase plans. |
| gsd-project-researcher | Researches project ecosystem. |
| gsd-research-synthesizer | Merges researcher outputs. |
| gsd-roadmapper | Builds roadmaps. |
| gsd-security-auditor | Verifies security mitigations. |
| gsd-ui-auditor | Audits UI against quality bar. |
| gsd-ui-checker | Validates UI spec. |
| gsd-ui-researcher | Produces UI spec. |
| gsd-user-profiler | Scores developer profile. |
| gsd-verifier | Verifies phase delivery. |

## Execution protocol

When invoked:

1. Parse `<agent-id>` and `<task description>` from args.
2. If missing or `--list`, print compact index and stop.
3. Validate `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/agents/<agent-id>.md` exists using `Bash` test or `Glob`. Do not `Read` it.
4. Spawn `Agent` with:
   - `subagent_type: general-purpose`
   - `description: "<agent-id>: <short task summary>"`
   - `prompt`: compact bootstrap below.

Bootstrap prompt template:

```text
You are running lazy GSD agent <agent-id>.

First, read ${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/agents/<agent-id>.md yourself. Strip YAML frontmatter and follow the body as your system instructions for this task. Do not print the agent definition back to the coordinator.

Graphify-first rule: if the task involves repo architecture, planning, dependencies, cross-file relationships, codebase review, or implementation, resolve the project root with `git rev-parse --show-toplevel`. If `$PROJECT_ROOT/graphify-out/GRAPH_REPORT.md` exists, read it before raw source reads or searches. Use `graphify query`, `graphify path`, or `graphify explain` as the route-finder before `Grep`, `Glob`, `rg`, or `find`; use raw search only to verify exact code locations. If the task changes code on the main working tree, run `graphify update "$PROJECT_ROOT"` before the final response. If the task is an executor inside a wave/worktree, report changed files and `graphify_refresh_needed: true`; the orchestrator refreshes after the wave merge.

Project path: <current project path>

USER TASK:
<task description>
```

5. Return the `Agent` result verbatim.

## Missing agent handling

If file missing, list closest matches from `${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}/.claude/agents/*.md` by filename. Keep output short.

## Notes

- This bridge loses native `subagent_type` tool isolation. Agent body must enforce its own tool discipline.
- Do not fall back to coordinator-side full definition loading. That defeats the purpose of this skill.
- If a stricter sandbox is required, spawn a constrained native subagent and pass only compact task instructions.
