import vm from 'node:vm';

// Runs an MCP Apps page the way a host would, minus the browser: its scripts run in a vm
// against just enough DOM for the views, and the test plays the host over postMessage.

type Message = Record<string, unknown> & { id?: unknown; method?: string; params?: any };

class FakeStyle {
  height = '';
  colorScheme = '';
  readonly props = new Map<string, string>();
  setProperty(name: string, value: string) {
    this.props.set(name, value);
  }
}

export class FakeElement {
  readonly tagName: string;
  children: FakeElement[] = [];
  id = '';
  hidden = false;
  disabled = false;
  className = '';
  title = '';
  type = '';
  readonly dataset: Record<string, string> = {};
  readonly style = new FakeStyle();
  readonly attributes = new Map<string, string>();
  readonly classList = {
    toggle: (name: string, force?: boolean) => {
      const names = new Set(this.className.split(/\s+/).filter(Boolean));
      const on = force ?? !names.has(name);
      if (on) names.add(name);
      else names.delete(name);
      this.className = [...names].join(' ');
      return on;
    },
    contains: (name: string) => this.className.split(/\s+/).includes(name),
  };
  private text = '';
  private readonly listeners = new Map<string, Array<(event: unknown) => void>>();

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get textContent(): string {
    return this.children.length
      ? this.children.map((child) => child.textContent).join('')
      : this.text;
  }

  set textContent(value: string) {
    this.children = [];
    this.text = String(value);
  }

  append(...nodes: Array<FakeElement | string>) {
    for (const node of nodes) {
      if (typeof node === 'string') {
        const text = new FakeElement('#text');
        text.textContent = node;
        this.children.push(text);
      } else {
        this.children.push(node);
      }
    }
  }

  replaceChildren(...nodes: Array<FakeElement | string>) {
    this.children = [];
    this.text = '';
    this.append(...nodes);
  }

  setAttribute(name: string, value: unknown) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  /** Like a user's click: nothing happens on a disabled or hidden element */
  click() {
    if (this.disabled || this.hidden) return;
    for (const listener of this.listeners.get('click') ?? []) listener({ type: 'click' });
  }

  getBoundingClientRect() {
    return { width: 400, height: 120 };
  }

  /** This element and all below it */
  *walk(): Generator<FakeElement> {
    yield this;
    for (const child of this.children) yield* child.walk();
  }
}

// An element in the page's own markup that has an id, with the rest of its start tag
const ELEMENT_WITH_ID = /<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi;

export class FakeDocument {
  readonly documentElement = new FakeElement('html');
  readonly body = new FakeElement('body');
  private readonly byId = new Map<string, FakeElement>();

  /** Knows only the ids in the page's markup, so a renamed control fails like in a browser */
  constructor(page: string) {
    // Script contents are code, not markup: keep only the <script> tags themselves
    const markup = page.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/g, '$1$2');
    for (const [, tagName, attributes, id] of markup.matchAll(ELEMENT_WITH_ID)) {
      const element = new FakeElement(tagName);
      element.id = id;
      element.hidden = /(^|\s)hidden(\s|=|$)/.test(attributes);
      element.disabled = /(^|\s)disabled(\s|=|$)/.test(attributes);
      this.byId.set(id, element);
    }
  }

  getElementById(id: string) {
    return this.byId.get(id) ?? null;
  }

  createElement(tagName: string) {
    return new FakeElement(tagName);
  }

  createElementNS(_namespace: string, tagName: string) {
    return new FakeElement(tagName);
  }
}

export interface ViewHost {
  document: FakeDocument;
  /** The page's global object, where its scripts left their globals */
  global: Record<string, any>;
  /** Everything the view posted to the host, oldest first */
  sent: Message[];
  /** The view's latest request for this method */
  request(method: string): Message | undefined;
  requests(method: string): Message[];
  /** Posts a message to the view from the host window */
  post(message: Record<string, unknown>): void;
  /** Posts from some other window, which the view must ignore */
  postFromElsewhere(message: Record<string, unknown>): void;
  notify(method: string, params?: unknown): void;
  answer(method: string, result: unknown): void;
  fail(method: string, message: string): void;
  /** Answers ui/initialize */
  initialize(hostCapabilities: Record<string, unknown>, hostContext?: unknown): void;
  /** Lets the view's promise chains run */
  flush(): Promise<void>;
}

const CONFIG_SCRIPT = /<script type="application\/json" id="mcp-app-config">([\s\S]*?)<\/script>/;

/** The config the server filled into a page */
export function pageConfig(page: string): Record<string, any> {
  return JSON.parse(CONFIG_SCRIPT.exec(page)![1]);
}

export function runPage(page: string): ViewHost {
  const document = new FakeDocument(page);
  const config = document.getElementById('mcp-app-config');
  if (config) config.textContent = CONFIG_SCRIPT.exec(page)?.[1] ?? '';
  const sent: Message[] = [];
  const listeners: Array<(event: unknown) => void> = [];
  const parent = {
    // A copy, so the test sees plain objects rather than the vm's
    postMessage: (message: unknown) => sent.push(JSON.parse(JSON.stringify(message))),
  };
  const global: Record<string, any> = vm.createContext({
    document,
    parent,
    innerWidth: 400,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (type === 'message') listeners.push(listener);
    },
    // Looked up on each call, so vi.useFakeTimers() applies
    setTimeout: (callback: () => void, ms?: number) => setTimeout(callback, ms),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
    requestAnimationFrame: (callback: (time: number) => void) => {
      callback(0);
      return 0;
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    URL,
  });
  global.window = global;
  for (const [, source] of page.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(source, global);
  }

  const deliver = (source: unknown, data: unknown) => {
    for (const listener of listeners) listener({ source, data });
  };
  const requests = (method: string) =>
    sent.filter((m) => m.method === method && m.id !== undefined);
  const host: ViewHost = {
    document,
    global,
    sent,
    requests,
    request: (method) => requests(method).at(-1),
    post: (message) => deliver(parent, message),
    postFromElsewhere: (message) => deliver({}, message),
    notify: (method, params) => deliver(parent, { jsonrpc: '2.0', method, params }),
    answer: (method, result) => {
      const request = host.request(method);
      if (!request) throw new Error(`the view sent no ${method}`);
      deliver(parent, { jsonrpc: '2.0', id: request.id, result });
    },
    fail: (method, message) => {
      const request = host.request(method);
      if (!request) throw new Error(`the view sent no ${method}`);
      deliver(parent, { jsonrpc: '2.0', id: request.id, error: { code: -32000, message } });
    },
    initialize: (hostCapabilities, hostContext) =>
      host.answer('ui/initialize', {
        protocolVersion: '2026-01-26',
        hostInfo: { name: 'test-host', version: '1' },
        hostCapabilities,
        hostContext: hostContext ?? {},
      }),
    flush: async () => {
      for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
    },
  };
  return host;
}
