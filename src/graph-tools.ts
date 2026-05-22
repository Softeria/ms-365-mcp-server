import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from './logger.js';
import GraphClient from './graph-client.js';
import AuthManager from './auth.js';
import { api } from './generated/client.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getRequestTokens } from './request-context.js';
import { parseTeamsUrl } from './lib/teams-url-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointConfig {
  pathPattern: string;
  method: string;
  toolName: string;
  scopes?: string[];
  workScopes?: string[];
  returnDownloadUrl?: boolean;
  supportsTimezone?: boolean;
  supportsExpandExtendedProperties?: boolean;
  llmTip?: string;
  skipEncoding?: string[]; // Parameter names that should NOT be URL-encoded (for function-style API calls)
  contentType?: string;
  acceptType?: string; // Custom Accept header for endpoints returning non-JSON content (e.g., text/vtt)
  readOnly?: boolean; // When true, allow this endpoint in read-only mode even if method is not GET
}

const endpointsData = JSON.parse(
  readFileSync(path.join(__dirname, 'endpoints.json'), 'utf8')
) as EndpointConfig[];

/** When set to a positive integer, caps Graph `$top` on list requests (see README). */
function maxTopFromEnv(): number | undefined {
  const raw = process.env.MS365_MCP_MAX_TOP;
  if (raw === undefined || raw === '') return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    logger.warn(
      `Ignoring invalid MS365_MCP_MAX_TOP=${JSON.stringify(raw)} (use a positive integer)`
    );
    return undefined;
  }
  return n;
}

function clampTopQueryParam(queryParams: Record<string, string>): void {
  const cap = maxTopFromEnv();
  if (cap === undefined || queryParams['$top'] === undefined) return;
  const requested = Number.parseInt(queryParams['$top'], 10);
  if (!Number.isFinite(requested) || requested <= cap) return;
  logger.info(`Clamping $top from ${requested} to ${cap} (MS365_MCP_MAX_TOP)`);
  queryParams['$top'] = String(cap);
}

type TextContent = {
  type: 'text';
  text: string;
  [key: string]: unknown;
};

type ImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type AudioContent = {
  type: 'audio';
  data: string;
  mimeType: string;
  [key: string]: unknown;
};

type ResourceTextContent = {
  type: 'resource';
  resource: {
    text: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceBlobContent = {
  type: 'resource';
  resource: {
    blob: string;
    uri: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type ResourceContent = ResourceTextContent | ResourceBlobContent;

type ContentItem = TextContent | ImageContent | AudioContent | ResourceContent;

interface CallToolResult {
  content: ContentItem[];
  _meta?: Record<string, unknown>;
  isError?: boolean;

  [key: string]: unknown;
}

interface UtilityToolContext {
  graphClient: GraphClient;
  authManager?: AuthManager;
  multiAccount: boolean;
  accountNames: string[];
}

interface UtilityTool {
  name: string;
  // Synthetic for display in search-tools / get-tool-schema. The `tool:` prefix
  // marks these as non-Graph so an LLM doesn't try to construct a Graph URL from them.
  method: string;
  path: string;
  description: string;
  buildSchema: (ctx: UtilityToolContext) => Record<string, z.ZodTypeAny>;
  execute: (params: Record<string, unknown>, ctx: UtilityToolContext) => Promise<CallToolResult>;
  readOnlyHint?: boolean;
  openWorldHint?: boolean;
}

export const UTILITY_TOOLS: readonly UtilityTool[] = [
  {
    name: 'parse-teams-url',
    method: 'POST',
    path: 'tool:parse-teams-url',
    description:
      'Converts any Teams meeting URL format (short /meet/, full /meetup-join/, or recap ?threadId=) into a standard joinWebUrl. Use this before list-online-meetings when the user provides a recap or short URL.',
    readOnlyHint: true,
    openWorldHint: false,
    buildSchema: () => ({
      url: z.string().describe('Teams meeting URL in any format'),
    }),
    execute: async (params) => {
      const url = params.url;
      if (typeof url !== 'string') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'url is required.' }) }],
          isError: true,
        };
      }
      try {
        const joinWebUrl = parseTeamsUrl(url);
        return { content: [{ type: 'text', text: joinWebUrl }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
          isError: true,
        };
      }
    },
  },
  {
    name: 'download-bytes',
    method: 'GET',
    path: 'tool:download-bytes',
    description:
      'Download binary content from Microsoft Graph and return it as base64. Single tool for any binary read: drive file content, mail attachment, profile photo, Teams hosted content, meeting recording. Returns { contentType, encoding: "base64", contentLength, contentBytes }.',
    readOnlyHint: true,
    openWorldHint: true,
    buildSchema: (ctx) => {
      const schema: Record<string, z.ZodTypeAny> = {
        target: z
          .string()
          .describe(
            'Relative Microsoft Graph path starting with "/". Common paths: ' +
              '/drives/{drive-id}/items/{driveItem-id}/content (drive file content); ' +
              '/me/messages/{message-id}/attachments/{attachment-id}/$value (mail attachment, list-mail-attachments returns the IDs); ' +
              '/me/photo/$value or /users/{user-id}/photo/$value (profile photo); ' +
              '/chats/{chat-id}/messages/{chatMessage-id}/hostedContents/{chatMessageHostedContent-id}/$value (Teams chat hosted content, list-chat-message-hosted-contents returns the IDs); ' +
              '/teams/{team-id}/channels/{channel-id}/messages/{chatMessage-id}/hostedContents/{chatMessageHostedContent-id}/$value (Teams channel hosted content). ' +
              'For meeting recordings (often large), use get-meeting-recording-content which returns a URL for out-of-band download by the client.'
          ),
      };
      if (ctx.multiAccount) {
        schema['account'] = z
          .string()
          .optional()
          .describe(
            'Account to use when multiple Microsoft accounts are configured. Required when multiple accounts exist (see list-accounts).'
          );
      }
      return schema;
    },
    execute: async (params, { graphClient, authManager }) => {
      const target = params.target;
      const accountParam = params.account as string | undefined;
      if (typeof target !== 'string' || target.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'target is required and must be a non-empty string.' }),
            },
          ],
          isError: true,
        };
      }
      if (!target.startsWith('/')) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error:
                  'target must be a relative Microsoft Graph path starting with "/", e.g. /me/photo/$value or /drives/{drive-id}/items/{driveItem-id}/content. Absolute URLs are not accepted; if you have an @microsoft.graph.downloadUrl, use the equivalent /content or /$value path instead (Graph 302-redirects to the same bytes).',
              }),
            },
          ],
          isError: true,
        };
      }
      try {
        let accountAccessToken: string | undefined;
        if (authManager && !authManager.isOAuthModeEnabled() && !getRequestTokens()) {
          accountAccessToken = await authManager.getTokenForAccount(accountParam);
        }
        return await graphClient.graphRequest(target, { accessToken: accountAccessToken });
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: (error as Error).message }) }],
          isError: true,
        };
      }
    },
  },
];

function registerUtilityToolWithMcp(
  server: McpServer,
  utility: UtilityTool,
  ctx: UtilityToolContext
): void {
  server.tool(
    utility.name,
    utility.description,
    utility.buildSchema(ctx),
    {
      title: utility.name,
      readOnlyHint: utility.readOnlyHint ?? true,
      openWorldHint: utility.openWorldHint ?? true,
    },
    async (params) => utility.execute(params, ctx)
  );
}

async function executeGraphTool(
  tool: (typeof api.endpoints)[0],
  config: EndpointConfig | undefined,
  graphClient: GraphClient,
  params: Record<string, unknown>,
  authManager?: AuthManager
): Promise<CallToolResult> {
  logger.info(`Tool ${tool.alias} called with params: ${JSON.stringify(params)}`);
  try {
    // Resolve account-specific token if `account` parameter is provided (or auto-resolve for single account).
    // Skip in OAuth/HTTP mode — let the request context drive token selection via GraphClient.
    // Also skip when a request-context token exists (HTTP/OAuth flow where token comes from middleware).
    let accountAccessToken: string | undefined;
    if (authManager && !authManager.isOAuthModeEnabled() && !getRequestTokens()) {
      const accountParam = params.account as string | undefined;
      try {
        accountAccessToken = await authManager.getTokenForAccount(accountParam);
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: (err as Error).message }),
            },
          ],
          isError: true,
        };
      }
    }

    const parameterDefinitions = tool.parameters || [];

    let path = tool.path;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    let body: unknown = null;

    for (const [paramName, paramValue] of Object.entries(params)) {
      // Skip control parameters - not part of the Microsoft Graph API
      if (
        [
          'account',
          'fetchAllPages',
          'includeHeaders',
          'excludeResponse',
          'timezone',
          'expandExtendedProperties',
        ].includes(paramName)
      ) {
        continue;
      }

      // Ok, so, MCP clients (such as claude code) doesn't support $ in parameter names,
      // and others might not support __, so we strip them in hack.ts and restore them here
      const odataParams = [
        'filter',
        'select',
        'expand',
        'orderby',
        'skip',
        'top',
        'count',
        'search',
        'format',
      ];
      // Handle both "top" and "$top" formats - strip $ if present, then re-add it
      const normalizedParamName = paramName.startsWith('$') ? paramName.slice(1) : paramName;
      const isOdataParam = odataParams.includes(normalizedParamName.toLowerCase());
      const fixedParamName = isOdataParam ? `$${normalizedParamName.toLowerCase()}` : paramName;
      // Convert kebab-case param names to camelCase for path param matching.
      // endpoints.json uses {message-id} but hack.ts extracts :messageId (camelCase) from the path.
      // LLMs may pass "message-id" (kebab) — we normalize so both forms work.
      const camelCaseParamName = paramName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

      // Look up param definition using normalized name (without $) for OData params,
      // or camelCase equivalent for kebab-case path params
      const paramDef = parameterDefinitions.find(
        (p) =>
          p.name === paramName ||
          p.name === camelCaseParamName ||
          (isOdataParam && p.name === normalizedParamName)
      );

      if (paramDef) {
        switch (paramDef.type) {
          case 'Path': {
            // Check if this parameter should skip URL encoding (for function-style API calls)
            const shouldSkipEncoding = config?.skipEncoding?.includes(paramName) ?? false;
            // Use encodeURIComponent but preserve '=' which is valid in path segments (RFC 3986)
            // and commonly appears in Microsoft Graph base64-encoded resource IDs.
            // Without this, IDs like "AAMk...AAA=" become "AAMk...AAA%3D" causing 404 errors.
            // First we encode, then unencode. Crazy, check out https://github.com/Softeria/ms-365-mcp-server/issues/245
            const encodedValue = shouldSkipEncoding
              ? (paramValue as string)
              : encodeURIComponent(paramValue as string).replace(/%3D/g, '=');

            // Replace both the original param name and the camelCase variant
            // to handle {message-id} (endpoints.json) and :messageId (generated client) formats
            path = path
              .replace(`{${paramName}}`, encodedValue)
              .replace(`:${paramName}`, encodedValue)
              .replace(`{${camelCaseParamName}}`, encodedValue)
              .replace(`:${camelCaseParamName}`, encodedValue);
            break;
          }

          case 'Query':
            if (paramValue !== '' && paramValue != null) {
              queryParams[fixedParamName] = `${paramValue}`;
            }
            break;

          case 'Body':
            if (paramDef.schema) {
              const parseResult = paramDef.schema.safeParse(paramValue);
              if (!parseResult.success) {
                const wrapped = { [paramName]: paramValue };
                const wrappedResult = paramDef.schema.safeParse(wrapped);
                if (wrappedResult.success) {
                  logger.info(
                    `Auto-corrected parameter '${paramName}': AI passed nested field directly, wrapped it as {${paramName}: ...}`
                  );
                  body = wrapped;
                } else {
                  body = paramValue;
                }
              } else {
                body = paramValue;
              }
            } else {
              body = paramValue;
            }
            break;

          case 'Header':
            headers[fixedParamName] = `${paramValue}`;
            break;
        }
      } else if (paramName === 'body') {
        body = paramValue;
        logger.info(`Set body param: ${JSON.stringify(body)}`);
      } else if (
        path.includes(`:${paramName}`) ||
        path.includes(`{${paramName}}`) ||
        path.includes(`:${camelCaseParamName}`) ||
        path.includes(`{${camelCaseParamName}}`)
      ) {
        // Fallback: path param not declared in tool.parameters (generated client omits them).
        // Replace placeholder directly so the URL is valid.
        const encodedValue = encodeURIComponent(paramValue as string).replace(/%3D/g, '=');
        path = path
          .replace(`{${paramName}}`, encodedValue)
          .replace(`:${paramName}`, encodedValue)
          .replace(`{${camelCaseParamName}}`, encodedValue)
          .replace(`:${camelCaseParamName}`, encodedValue);
        logger.info(`Path param fallback: replaced :${camelCaseParamName} with encoded value`);
      }
    }

    clampTopQueryParam(queryParams);

    const preferValues: string[] = [];

    // Handle timezone parameter for calendar endpoints
    if (config?.supportsTimezone && params.timezone) {
      preferValues.push(`outlook.timezone="${params.timezone}"`);
      logger.info(`Setting timezone preference: outlook.timezone="${params.timezone}"`);
    }

    const bodyFormat = process.env.MS365_MCP_BODY_FORMAT || 'text';
    if (bodyFormat !== 'html' && tool.method.toUpperCase() === 'GET') {
      preferValues.push(`outlook.body-content-type="${bodyFormat}"`);
    }

    if (preferValues.length > 0) {
      headers['Prefer'] = preferValues.join(', ');
    }

    // Handle expandExtendedProperties parameter for calendar endpoints
    if (config?.supportsExpandExtendedProperties && params.expandExtendedProperties === true) {
      const expandValue = 'singleValueExtendedProperties';
      if (queryParams['$expand']) {
        queryParams['$expand'] += `,${expandValue}`;
      } else {
        queryParams['$expand'] = expandValue;
      }
      logger.info(`Adding $expand=${expandValue} for extended properties`);
    }

    if (config?.contentType) {
      headers['Content-Type'] = config.contentType;
      logger.info(`Setting custom Content-Type: ${config.contentType}`);
    }

    if (config?.acceptType) {
      headers['Accept'] = config.acceptType;
      logger.info(`Setting custom Accept: ${config.acceptType}`);
    }

    if (Object.keys(queryParams).length > 0) {
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value).replace(/%2C/gi, ',')}`)
        .join('&');
      path = `${path}${path.includes('?') ? '&' : '?'}${queryString}`;
    }

    const options: {
      method: string;
      headers: Record<string, string>;
      body?: string | Buffer | Uint8Array;
      rawResponse?: boolean;
      includeHeaders?: boolean;
      excludeResponse?: boolean;
      queryParams?: Record<string, string>;
      accessToken?: string;
    } = {
      method: tool.method.toUpperCase(),
      headers,
    };

    if (options.method !== 'GET' && body) {
      if (tool.requestFormat === 'binary' && typeof body === 'string') {
        options.body = Buffer.from(body, 'base64');
        if (!config?.contentType) {
          headers['Content-Type'] = 'application/octet-stream';
        }
      } else if (config?.contentType === 'text/html') {
        if (typeof body === 'string') {
          options.body = body;
        } else if (typeof body === 'object' && 'content' in body) {
          options.body = (body as { content: string }).content;
        } else {
          options.body = String(body);
        }
      } else {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }
    }

    const isProbablyMediaContent =
      tool.errors?.some((error) => error.description === 'Retrieved media content') ||
      path.endsWith('/content');

    if (config?.returnDownloadUrl && path.endsWith('/content')) {
      path = path.replace(/\/content$/, '');
      logger.info(
        `Auto-returning download URL for ${tool.alias} (returnDownloadUrl=true in endpoints.json)`
      );
    } else if (isProbablyMediaContent) {
      options.rawResponse = true;
    }

    // Set includeHeaders if requested
    if (params.includeHeaders === true) {
      options.includeHeaders = true;
    }

    // Set excludeResponse if requested
    if (params.excludeResponse === true) {
      options.excludeResponse = true;
    }

    // Pass account-resolved token if available
    if (accountAccessToken) {
      options.accessToken = accountAccessToken;
    }

    // Redact accessToken from log output to prevent credential leakage
    const { accessToken: _redacted, ...safeOptions } = options;
    logger.info(
      `Making graph request to ${path} with options: ${JSON.stringify(safeOptions)}${_redacted ? ' [accessToken=REDACTED]' : ''}`
    );

    let response = await graphClient.graphRequest(path, options);

    const fetchAllPages = params.fetchAllPages === true;
    if (fetchAllPages && response?.content?.[0]?.text) {
      try {
        let combinedResponse = JSON.parse(response.content[0].text);
        let allItems = combinedResponse.value || [];
        let nextLink = combinedResponse['@odata.nextLink'];
        let pageCount = 1;
        const maxPages = 100;
        const maxItems = 10_000;

        while (nextLink && pageCount < maxPages && allItems.length < maxItems) {
          logger.info(`Fetching page ${pageCount + 1} from: ${nextLink}`);

          // Extract path + query string from the nextLink URL.
          // Pass the full path (with query string) as the endpoint so that
          // $skiptoken and other pagination params are preserved.
          // Previously, query params were extracted into nextOptions.queryParams
          // but graphRequest/performRequest never read that field — they were lost.
          const url = new URL(nextLink);
          const nextPath = url.pathname.replace('/v1.0', '') + url.search;
          const nextOptions = { ...options };

          const nextResponse = await graphClient.graphRequest(nextPath, nextOptions);
          if (nextResponse?.content?.[0]?.text) {
            const nextJsonResponse = JSON.parse(nextResponse.content[0].text);
            if (nextJsonResponse.value && Array.isArray(nextJsonResponse.value)) {
              allItems = allItems.concat(nextJsonResponse.value);
            }
            nextLink = nextJsonResponse['@odata.nextLink'];
            pageCount++;
          } else {
            break;
          }
        }

        if (pageCount >= maxPages) {
          logger.warn(`Reached maximum page limit (${maxPages}) for pagination`);
        }
        if (allItems.length >= maxItems) {
          logger.warn(
            `Reached maximum item limit (${maxItems}) for pagination — truncated at ${allItems.length} items`
          );
        }

        combinedResponse.value = allItems;
        if (combinedResponse['@odata.count']) {
          combinedResponse['@odata.count'] = allItems.length;
        }
        delete combinedResponse['@odata.nextLink'];

        response.content[0].text = JSON.stringify(combinedResponse);

        logger.info(
          `Pagination complete: collected ${allItems.length} items across ${pageCount} pages`
        );
      } catch (e) {
        logger.error(`Error during pagination: ${e}`);
      }
    }

    if (response?.content?.[0]?.text) {
      const responseText = response.content[0].text;
      logger.info(`Response size: ${responseText.length} characters`);

      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.value && Array.isArray(jsonResponse.value)) {
          logger.info(`Response contains ${jsonResponse.value.length} items`);
        }
        if (jsonResponse['@odata.nextLink']) {
          logger.info(`Response has pagination nextLink: ${jsonResponse['@odata.nextLink']}`);
        }
      } catch {
        // Non-JSON response
      }
    }

    // Convert McpResponse to CallToolResult with the correct structure
    const content: ContentItem[] = response.content.map((item) => ({
      type: 'text' as const,
      text: item.text,
    }));

    return {
      content,
      _meta: response._meta,
      isError: response.isError,
    };
  } catch (error) {
    logger.error(`Error in tool ${tool.alias}: ${(error as Error).message}`);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: `Error in tool ${tool.alias}: ${(error as Error).message}`,
          }),
        },
      ],
      isError: true,
    };
  }
}

export function registerGraphTools(
  server: McpServer,
  graphClient: GraphClient,
  authManager?: AuthManager,
  multiAccount: boolean = false,
  accountNames: string[] = []
): number {
  let registeredCount = 0;
  let failedCount = 0;

  for (const tool of api.endpoints) {
    const endpointConfig = endpointsData.find((e) => e.toolName === tool.alias);

    const paramSchema: Record<string, z.ZodTypeAny> = {};
    if (tool.parameters && tool.parameters.length > 0) {
      for (const param of tool.parameters) {
        paramSchema[param.name] = param.schema || z.any();
      }
    }

    // Extract path parameters from the path pattern (e.g., :todoTaskListId from /me/todo/lists/:todoTaskListId/tasks)
    // The generated client omits these from tool.parameters, so we add them manually.
    const pathParamMatches = tool.path.matchAll(/:([a-zA-Z]+)/g);
    for (const match of pathParamMatches) {
      const pathParamName = match[1];
      if (!(pathParamName in paramSchema)) {
        paramSchema[pathParamName] = z.string().describe(`Path parameter: ${pathParamName}`);
      }
    }

    if (tool.method.toUpperCase() === 'GET' && tool.path.includes('/')) {
      paramSchema['fetchAllPages'] = z
        .boolean()
        .describe(
          'Follow @odata.nextLink and merge up to 100 pages into one response. ' +
            'Can return enormous payloads—only when the user explicitly needs a full export. ' +
            'Prefer a small $top first, then paginate or narrow with $filter/$search.'
        )
        .optional();
    }

    // Override OData parameter descriptions with spec-gap guidance
    if (paramSchema['filter'] !== undefined || paramSchema['$filter'] !== undefined) {
      const key = paramSchema['$filter'] !== undefined ? '$filter' : 'filter';
      paramSchema[key] = z
        .string()
        .describe(
          'OData filter expression. Add $count=true for advanced filters (flag/flagStatus, contains()). Cannot combine with $search.'
        )
        .optional();
    }
    if (paramSchema['search'] !== undefined || paramSchema['$search'] !== undefined) {
      const key = paramSchema['$search'] !== undefined ? '$search' : 'search';
      paramSchema[key] = z
        .string()
        .describe('KQL search query — wrap value in double quotes. Cannot combine with $filter.')
        .optional();
    }
    if (paramSchema['select'] !== undefined || paramSchema['$select'] !== undefined) {
      const key = paramSchema['$select'] !== undefined ? '$select' : 'select';
      paramSchema[key] = z
        .string()
        .describe('Comma-separated fields to return, e.g. id,subject,from,receivedDateTime')
        .optional();
    }
    if (paramSchema['orderby'] !== undefined || paramSchema['$orderby'] !== undefined) {
      const key = paramSchema['$orderby'] !== undefined ? '$orderby' : 'orderby';
      paramSchema[key] = z
        .string()
        .describe('Sort expression, e.g. receivedDateTime desc')
        .optional();
    }
    if (paramSchema['top'] !== undefined || paramSchema['$top'] !== undefined) {
      const key = paramSchema['$top'] !== undefined ? '$top' : 'top';
      paramSchema[key] = z
        .number()
        .describe(
          'Page size (Graph $top). Start small (e.g. 5–15) so responses fit the model context; ' +
            'raise only if needed. Use $select to return fewer fields per item. ' +
            'For more rows, use @odata.nextLink from the response instead of a very large $top.'
        )
        .optional();
    }
    if (paramSchema['skip'] !== undefined || paramSchema['$skip'] !== undefined) {
      const key = paramSchema['$skip'] !== undefined ? '$skip' : 'skip';
      paramSchema[key] = z
        .number()
        .describe('Items to skip for pagination. Not supported with $search.')
        .optional();
    }
    if (paramSchema['count'] !== undefined || paramSchema['$count'] !== undefined) {
      const countKey = paramSchema['$count'] !== undefined ? '$count' : 'count';
      paramSchema[countKey] = z
        .boolean()
        .describe(
          'Set true to enable advanced query mode (ConsistencyLevel: eventual). Required for complex $filter on flag/flagStatus or contains().'
        )
        .optional();
    }

    // Add account parameter for multi-account mode. Account names are surfaced in the
    // description (not a strict enum) so the LLM sees the choices upfront without a
    // round-trip; getTokenForAccount() validates the value at runtime.
    if (multiAccount) {
      const accountHint =
        accountNames.length > 0 ? `Known accounts: ${accountNames.join(', ')}. ` : '';
      paramSchema['account'] = z
        .string()
        .describe(
          `${accountHint}Microsoft account email to use for this request. ` +
            `Required when multiple accounts are configured. ` +
            `Use the list-accounts tool to discover all currently available accounts.`
        )
        .optional();
    }

    // Add includeHeaders parameter for all tools to capture ETags and other headers
    paramSchema['includeHeaders'] = z
      .boolean()
      .describe('Include response headers (including ETag) in the response metadata')
      .optional();

    // Add excludeResponse parameter to only return success/failure indication
    paramSchema['excludeResponse'] = z
      .boolean()
      .describe('Exclude the full response body and only return success or failure indication')
      .optional();

    // Add timezone parameter for calendar endpoints that support it
    if (endpointConfig?.supportsTimezone) {
      paramSchema['timezone'] = z
        .string()
        .describe(
          'IANA timezone name (e.g., "America/New_York", "Europe/London", "Asia/Tokyo") for calendar event times. If not specified, times are returned in UTC.'
        )
        .optional();
    }

    // Add expandExtendedProperties parameter for calendar endpoints that support it
    if (endpointConfig?.supportsExpandExtendedProperties) {
      paramSchema['expandExtendedProperties'] = z
        .boolean()
        .describe(
          'When true, expands singleValueExtendedProperties on each event. Use this to retrieve custom extended properties (e.g., sync metadata) stored on calendar events.'
        )
        .optional();
    }

    // Build the tool description, optionally appending LLM tips
    let toolDescription =
      tool.description || `Execute ${tool.method.toUpperCase()} request to ${tool.path}`;
    if (endpointConfig?.llmTip) {
      toolDescription += `\n\n💡 TIP: ${endpointConfig.llmTip}`;
    }

    try {
      server.tool(
        tool.alias,
        toolDescription,
        paramSchema,
        {
          title: tool.alias,
          readOnlyHint: tool.method.toUpperCase() === 'GET',
          destructiveHint: ['POST', 'PATCH', 'DELETE'].includes(tool.method.toUpperCase()),
          openWorldHint: true, // All tools call Microsoft Graph API
        },
        async (params) => executeGraphTool(tool, endpointConfig, graphClient, params, authManager)
      );
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool ${tool.alias}: ${(error as Error).message}`);
      failedCount++;
    }
  }

  if (multiAccount) {
    logger.info('Multi-account mode: "account" parameter injected into all tool schemas');
  }

  const utilityCtx: UtilityToolContext = {
    graphClient,
    authManager,
    multiAccount,
    accountNames,
  };
  for (const utility of UTILITY_TOOLS) {
    try {
      registerUtilityToolWithMcp(server, utility, utilityCtx);
      registeredCount++;
    } catch (error) {
      logger.error(`Failed to register tool ${utility.name}: ${(error as Error).message}`);
      failedCount++;
    }
  }

  logger.info(`Tool registration complete: ${registeredCount} registered, ${failedCount} failed`);
  return registeredCount;
}
