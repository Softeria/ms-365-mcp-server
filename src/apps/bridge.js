/* exported createMcpAppBridge */

// MCP Apps (spec 2026-01-26): JSON-RPC 2.0 with the host over postMessage. The server inlines
// this into every view, before the view's own script, which calls createMcpAppBridge once.
function createMcpAppBridge(handlers) {
  'use strict';

  const PROTOCOL_VERSION = '2026-01-26';
  // Like ext-apps' App: a request the host never answers fails after this, and a tool call's
  // timer starts over on each progress notification, so a host heartbeat keeps it alive
  const REQUEST_TIMEOUT_MS = 60000;

  let nextId = 1;
  const pending = new Map();
  let capabilities = {};
  let locale;
  let inputSeen = false;
  let resultSeen = false;

  function post(message) {
    window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, message), '*');
  }

  // options.timeout: milliseconds, 0 for none. options.progress: ask for progress notifications.
  function request(method, params, options) {
    const id = nextId++;
    const timeout =
      options && typeof options.timeout === 'number' ? options.timeout : REQUEST_TIMEOUT_MS;
    let sent = params;
    if (options && options.progress) {
      const meta = Object.assign({}, params && params._meta, { progressToken: id });
      sent = Object.assign({}, params, { _meta: meta });
    }
    return new Promise((resolve, reject) => {
      const waiter = { method, resolve, reject, timeout, timer: undefined };
      pending.set(id, waiter);
      arm(id, waiter);
      post({ id, method, params: sent });
    });
  }

  function arm(id, waiter) {
    clearTimeout(waiter.timer);
    if (waiter.timeout > 0) {
      waiter.timer = setTimeout(() => {
        // Like the SDK: tell the host the view gave up, so it can drop the request too
        notify('notifications/cancelled', { requestId: id, reason: 'Timed out' });
        const error = new Error('The host did not answer in time.');
        error.name = 'TimeoutError';
        settle(id, error);
      }, waiter.timeout);
    }
  }

  function settle(id, error, result) {
    const waiter = pending.get(id);
    if (!waiter) return;
    pending.delete(id);
    clearTimeout(waiter.timer);
    if (error) waiter.reject(error);
    else waiter.resolve(result);
  }

  function notify(method, params) {
    post({ method, params });
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') return;
    if (typeof msg.method === 'string') {
      if (msg.id !== undefined) answerHost(msg);
      else onNotification(msg.method, isObject(msg.params) ? msg.params : {});
      return;
    }
    if (msg.error) settle(msg.id, new Error(msg.error.message || 'The host refused.'));
    else settle(msg.id, undefined, msg.result);
  });

  function answerHost(msg) {
    if (msg.method === 'ui/resource-teardown' || msg.method === 'ping') {
      post({ id: msg.id, result: {} });
    } else {
      post({ id: msg.id, error: { code: -32601, message: 'Method not found' } });
    }
  }

  // Only the first tool-input and tool-result count: they are the call that opened the view.
  // Hosts may echo the view's own calls here too (the spec's interactive phase), and those
  // answers already come back to the request that made them.
  function onNotification(method, params) {
    if (method === 'ui/notifications/tool-input') {
      if (!inputSeen && !resultSeen) {
        inputSeen = true;
        handle('onToolInput', isObject(params.arguments) ? params.arguments : {});
      }
    } else if (method === 'ui/notifications/tool-result') {
      if (!resultSeen) {
        resultSeen = true;
        handle('onToolResult', params);
      }
    } else if (method === 'ui/notifications/tool-cancelled') {
      // This is about the call that opened the view, never one the view made itself, so
      // it means nothing once that call's result is in
      if (!resultSeen) handle('onToolCancelled', params);
    } else if (method === 'notifications/progress') {
      const waiter = pending.get(params.progressToken);
      if (waiter) arm(params.progressToken, waiter);
    } else if (method === 'ui/notifications/host-context-changed') {
      applyHostContext(params);
    }
  }

  function applyHostContext(context) {
    if (!isObject(context)) return;
    const root = document.documentElement;
    if (context.theme === 'light' || context.theme === 'dark') {
      root.dataset.theme = context.theme;
      root.style.colorScheme = context.theme;
    }
    const variables = context.styles && context.styles.variables;
    if (isObject(variables)) {
      for (const [name, value] of Object.entries(variables)) {
        if (name.startsWith('--') && typeof value === 'string') {
          root.style.setProperty(name, value);
        }
      }
    }
    if (typeof context.locale === 'string') locale = context.locale;
  }

  // Tell the host how tall the view is, like the official App's autoResize
  let lastWidth = 0;
  let lastHeight = 0;
  let sizeQueued = false;
  function reportSize() {
    if (sizeQueued) return;
    sizeQueued = true;
    requestAnimationFrame(() => {
      sizeQueued = false;
      const root = document.documentElement;
      const previous = root.style.height;
      root.style.height = 'max-content';
      const height = Math.ceil(root.getBoundingClientRect().height);
      root.style.height = previous;
      const width = Math.ceil(window.innerWidth);
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      notify('ui/notifications/size-changed', { width, height });
    });
  }

  // This server's tool results are JSON text; a failure sets isError and has an error field.
  // A body the model asked to leave out comes as structuredContent instead.
  function readToolResult(result, failure) {
    const failed = Boolean(result && result.isError);
    let data =
      !failed && result && isObject(result.structuredContent)
        ? result.structuredContent
        : undefined;
    if (data === undefined) {
      const text = resultText(result);
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          failed ? text || failure : 'This result is not JSON, so it is not shown here.'
        );
      }
    }
    if (failed || (isObject(data) && data.error)) throw new Error(errorText(data) || failure);
    return data;
  }

  // The message of a failed result, undefined when it did not fail. A success need not be
  // JSON at all: Graph answers some actions with an empty body.
  function toolError(result, failure) {
    const text = resultText(result);
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return result && result.isError ? text || failure : undefined;
    }
    if (!(result && result.isError) && !(isObject(data) && data.error)) return undefined;
    return errorText(data) || text || failure;
  }

  function resultText(result) {
    const blocks = result && Array.isArray(result.content) ? result.content : [];
    return blocks
      .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
  }

  // { error: 'text' }, Graph's { error: { message } } or { error: 'code', message }
  function errorText(data) {
    if (!isObject(data)) return undefined;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (isObject(data.error) && typeof data.error.message === 'string') {
      return data.error.message;
    }
    return undefined;
  }

  function handle(name, value) {
    if (handlers && typeof handlers[name] === 'function') handlers[name](value);
  }

  function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  request('ui/initialize', {
    appInfo: { name: (handlers && handlers.name) || 'ms-365-app', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: PROTOCOL_VERSION,
  }).then(
    (result) => {
      capabilities = (result && isObject(result.hostCapabilities) && result.hostCapabilities) || {};
      applyHostContext(result && result.hostContext);
      notify('ui/notifications/initialized', {});
      const observer = new ResizeObserver(reportSize);
      observer.observe(document.documentElement);
      observer.observe(document.body);
      handle('onReady', capabilities);
    },
    (error) => handle('onInitError', error)
  );

  return {
    get capabilities() {
      return capabilities;
    },
    get locale() {
      return locale;
    },
    callTool(name, args, options) {
      return request(
        'tools/call',
        { name, arguments: args },
        Object.assign({ progress: true }, options)
      );
    },
    openLink(url) {
      return request('ui/open-link', { url });
    },
    updateModelContext(text) {
      return request('ui/update-model-context', { content: [{ type: 'text', text }] });
    },
    readToolResult,
    toolError,
  };
}
