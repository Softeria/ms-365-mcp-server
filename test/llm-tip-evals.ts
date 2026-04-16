#!/usr/bin/env tsx
/**
 * LLM Tip Eval Harness
 *
 * Tests whether the llmTips in endpoints.json actually guide an LLM to make
 * correct tool calls. Feeds tool schemas + descriptions to Claude via CLI,
 * gives it a user intent, and checks the generated tool call parameters.
 *
 * No Graph API calls — just verifies the LLM reads the tips correctly.
 *
 * Usage:
 *   npx tsx test/llm-tip-evals.ts              # run all evals
 *   npx tsx test/llm-tip-evals.ts --filter chat # run evals matching "chat"
 *   npx tsx test/llm-tip-evals.ts --verbose     # show full LLM responses
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──

interface EndpointConfig {
  toolName: string;
  pathPattern: string;
  method: string;
  scopes?: string[];
  workScopes?: string[];
  apiVersion?: string;
  llmTip?: string;
}

interface ToolCallAssertion {
  /** The tool name we expect the LLM to call */
  expectedTool: string;
  /** Params that MUST be present with specific values or patterns */
  requiredParams?: Record<string, string | RegExp | boolean>;
  /** Params that must NOT be present */
  forbiddenParams?: Record<string, string | RegExp>;
  /** Strings that MUST appear somewhere in the response */
  responseContains?: string[];
  /** Strings that must NOT appear in the response */
  responseNotContains?: string[];
}

interface EvalCase {
  id: string;
  description: string;
  /** The user intent to send to Claude */
  userPrompt: string;
  /** Which tools to expose (by toolName). Only these are available. */
  availableTools: string[];
  /** What we assert about the LLM's tool call */
  assertions: ToolCallAssertion;
}

// ── Load endpoints ──

const endpoints: EndpointConfig[] = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'src', 'endpoints.json'), 'utf8')
);

function buildToolDescription(ep: EndpointConfig): string {
  let desc = `${ep.method.toUpperCase()} ${ep.pathPattern}`;
  if (ep.apiVersion) desc += ` [API: ${ep.apiVersion}]`;
  if (ep.llmTip) desc += `\n\nTIP: ${ep.llmTip}`;
  return desc;
}

function buildToolSchema(ep: EndpointConfig): object {
  const params: Record<string, object> = {};

  // Extract path params
  const pathParams = ep.pathPattern.matchAll(/\{([^}]+)\}/g);
  for (const match of pathParams) {
    params[match[1]] = { type: 'string', description: `Path parameter: ${match[1]}` };
  }

  // Standard OData params for GET
  if (ep.method === 'get') {
    params['filter'] = { type: 'string', description: 'OData $filter expression' };
    params['select'] = { type: 'string', description: 'Comma-separated fields to return' };
    params['expand'] = {
      type: 'array',
      items: { type: 'string' },
      description: 'Navigation properties to expand',
    };
    params['orderby'] = { type: 'string', description: 'Sort expression' };
    params['top'] = { type: 'number', description: 'Page size' };
  }

  return {
    type: 'object',
    properties: params,
  };
}

// ── Eval cases ──

const evalCases: EvalCase[] = [
  {
    id: 'unread-chats-viewpoint',
    description: 'LLM should use $select (not $expand) for viewpoint on list-chats',
    userPrompt: 'Show me which of my Teams chats have unread messages.',
    availableTools: ['list-chats', 'list-chat-messages'],
    assertions: {
      expectedTool: 'list-chats',
      requiredParams: {
        select: /viewpoint/i,
      },
      forbiddenParams: {
        expand: /viewpoint/i,
      },
    },
  },
  {
    id: 'chat-messages-no-delta',
    description: 'LLM should use list-chat-messages with date ordering, not attempt delta',
    userPrompt:
      "What new messages are in my chat since yesterday? The chat ID is 19:abc123@thread.v2",
    availableTools: ['list-chat-messages'],
    assertions: {
      expectedTool: 'list-chat-messages',
      requiredParams: {
        'chat-id': '19:abc123@thread.v2',
        orderby: /lastModifiedDateTime/i,
      },
    },
  },
  {
    id: 'channel-delta-used',
    description: 'LLM should use channel messages delta for incremental channel sync',
    userPrompt:
      "Get me new messages in the General channel since last sync. Team ID is team-123, channel ID is channel-456.",
    availableTools: ['list-channel-messages', 'list-channel-messages-delta'],
    assertions: {
      expectedTool: 'list-channel-messages-delta',
      requiredParams: {
        'team-id': 'team-123',
        'channel-id': 'channel-456',
      },
    },
  },
  {
    id: 'unread-detection-workflow',
    description:
      'When asked about unread chats, LLM should mention comparing lastMessageReadDateTime vs lastUpdatedDateTime',
    userPrompt:
      'How can I detect which chats have unread messages? Just explain the approach, don\'t call any tools.',
    availableTools: ['list-chats', 'list-chat-messages'],
    assertions: {
      expectedTool: '', // no tool call expected
      responseContains: ['lastMessageReadDateTime', 'lastUpdatedDateTime'],
    },
  },
];

// ── Runner ──

function buildSystemPrompt(tools: EndpointConfig[]): string {
  const toolDescriptions = tools
    .map((t) => {
      const schema = JSON.stringify(buildToolSchema(t), null, 2);
      return `### ${t.toolName}\n${buildToolDescription(t)}\n\nParameters:\n\`\`\`json\n${schema}\n\`\`\``;
    })
    .join('\n\n');

  return `You are a Microsoft Graph API assistant. You have access to these tools:

${toolDescriptions}

When the user asks you to do something, respond with the tool call you would make.
Format your response as:

TOOL: <tool-name>
PARAMS:
\`\`\`json
{ ... }
\`\`\`

If no tool call is needed, just respond with your explanation.
IMPORTANT: Follow the TIP instructions in each tool description carefully.`;
}

interface EvalResult {
  id: string;
  description: string;
  passed: boolean;
  failures: string[];
  response: string;
}

function parseToolCall(response: string): { tool: string; params: Record<string, unknown> } | null {
  const toolMatch = response.match(/TOOL:\s*(\S+)/);
  if (!toolMatch) return null;

  const paramsMatch = response.match(/PARAMS:\s*```(?:json)?\s*([\s\S]*?)```/);
  let params: Record<string, unknown> = {};
  if (paramsMatch) {
    try {
      params = JSON.parse(paramsMatch[1]);
    } catch {
      // Try to extract individual key-value pairs
    }
  }

  return { tool: toolMatch[1], params };
}

function checkAssertion(
  response: string,
  toolCall: { tool: string; params: Record<string, unknown> } | null,
  assertions: ToolCallAssertion
): string[] {
  const failures: string[] = [];

  // Check expected tool
  if (assertions.expectedTool) {
    if (!toolCall) {
      failures.push(`Expected tool call to '${assertions.expectedTool}' but no tool was called`);
      return failures;
    }
    if (toolCall.tool !== assertions.expectedTool) {
      failures.push(
        `Expected tool '${assertions.expectedTool}' but got '${toolCall.tool}'`
      );
    }
  }

  // Check required params
  if (assertions.requiredParams && toolCall) {
    for (const [key, expected] of Object.entries(assertions.requiredParams)) {
      const actual = toolCall.params[key];
      const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);

      if (actual === undefined) {
        // Also check if the param appears anywhere in the response as a fallback
        if (expected instanceof RegExp) {
          if (!expected.test(response)) {
            failures.push(`Required param '${key}' not found in tool call or response`);
          }
        } else {
          failures.push(`Required param '${key}' missing from tool call`);
        }
      } else if (expected instanceof RegExp) {
        if (!expected.test(actualStr || '')) {
          failures.push(`Param '${key}' = '${actualStr}' does not match ${expected}`);
        }
      } else if (typeof expected === 'boolean') {
        if (actual !== expected) {
          failures.push(`Param '${key}' = ${actual}, expected ${expected}`);
        }
      } else if (actualStr !== expected) {
        failures.push(`Param '${key}' = '${actualStr}', expected '${expected}'`);
      }
    }
  }

  // Check forbidden params
  if (assertions.forbiddenParams && toolCall) {
    for (const [key, pattern] of Object.entries(assertions.forbiddenParams)) {
      const actual = toolCall.params[key];
      const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual);
      if (actual !== undefined && pattern instanceof RegExp && pattern.test(actualStr || '')) {
        failures.push(`Forbidden param pattern found: '${key}' matches ${pattern}`);
      }
    }
  }

  // Check response contains
  if (assertions.responseContains) {
    for (const expected of assertions.responseContains) {
      if (!response.toLowerCase().includes(expected.toLowerCase())) {
        failures.push(`Response missing expected text: '${expected}'`);
      }
    }
  }

  // Check response not contains
  if (assertions.responseNotContains) {
    for (const forbidden of assertions.responseNotContains) {
      if (response.toLowerCase().includes(forbidden.toLowerCase())) {
        failures.push(`Response contains forbidden text: '${forbidden}'`);
      }
    }
  }

  return failures;
}

async function runEval(evalCase: EvalCase, verbose: boolean): Promise<EvalResult> {
  const tools = evalCase.availableTools
    .map((name) => endpoints.find((e) => e.toolName === name))
    .filter((e): e is EndpointConfig => e !== undefined);

  const systemPrompt = buildSystemPrompt(tools);
  const fullPrompt = `${systemPrompt}\n\nUser: ${evalCase.userPrompt}`;

  // Write prompt to temp file to avoid shell escaping issues with backticks, quotes, JSON etc.
  const tmpDir = path.join(__dirname, '.eval-tmp');
  const { mkdirSync, writeFileSync: writeTmp, unlinkSync, rmSync } = await import('fs');
  mkdirSync(tmpDir, { recursive: true });
  const promptFile = path.join(tmpDir, `${evalCase.id}-${Date.now()}.txt`);
  writeTmp(promptFile, fullPrompt);

  let response: string;
  try {
    // Use absolute path to claude binary to avoid shell wrapper issues in subprocesses.
    // --tools "" disables built-in tools so the LLM can only "pretend" to call our described tools.
    const claudeBin = process.env.CLAUDE_BIN || `${process.env.HOME}/.local/bin/claude`;
    response = execSync(
      `cat "${promptFile}" | "${claudeBin}" -p --model sonnet --max-turns 1 --tools "" 2>/dev/null`,
      {
        encoding: 'utf8',
        timeout: 60_000,
      }
    ).trim();
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    response = error.stdout || error.message || 'EVAL_ERROR: claude command failed';
  } finally {
    try { unlinkSync(promptFile); } catch {}
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  }

  const toolCall = parseToolCall(response);
  const failures = checkAssertion(response, toolCall, evalCase.assertions);

  if (verbose || failures.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 ${evalCase.id}: ${evalCase.description}`);
    console.log(`   Prompt: ${evalCase.userPrompt}`);
    if (toolCall) {
      console.log(`   Tool called: ${toolCall.tool}`);
      console.log(`   Params: ${JSON.stringify(toolCall.params, null, 2)}`);
    }
    if (verbose) {
      console.log(`   Full response:\n${response.split('\n').map((l) => `   > ${l}`).join('\n')}`);
    }
  }

  return {
    id: evalCase.id,
    description: evalCase.description,
    passed: failures.length === 0,
    failures,
    response,
  };
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const filterIdx = args.indexOf('--filter');
  const filter = filterIdx >= 0 ? args[filterIdx + 1] : undefined;

  let cases = evalCases;
  if (filter) {
    cases = cases.filter(
      (c) => c.id.includes(filter) || c.description.toLowerCase().includes(filter.toLowerCase())
    );
  }

  console.log(`\n🧪 MCP LLM Tip Evals — ${cases.length} case(s)\n`);

  const results: EvalResult[] = [];
  for (const evalCase of cases) {
    process.stdout.write(`  ${evalCase.id} ... `);
    const result = await runEval(evalCase, verbose);
    results.push(result);
    console.log(result.passed ? '✅ PASS' : `❌ FAIL (${result.failures.join('; ')})`);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${results.length}`);

  if (failed > 0) {
    console.log('\nFailed evals:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ❌ ${r.id}:`);
      for (const f of r.failures) {
        console.log(`     - ${f}`);
      }
    }
  }

  // Write results to JSON for CI/tracking
  const outputPath = path.join(__dirname, 'llm-tip-eval-results.json');
  const output = {
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    results: results.map(({ response, ...rest }) => ({
      ...rest,
      responseLength: response.length,
    })),
  };

  const { writeFileSync } = await import('fs');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${outputPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
