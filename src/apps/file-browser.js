/* global createMcpAppBridge */

(() => {
  'use strict';

  // What the view needs from each item when it lists a folder itself
  const SELECT =
    'id,name,size,lastModifiedDateTime,webUrl,folder,file,package,parentReference,remoteItem';
  // Without these the view can't open folders or files (id always comes back)
  const NEEDED = ['name', 'folder', 'file', 'webUrl'];
  const PAGE_SIZE = 100;
  const FOLDER_ICON =
    'M2 5.5A1.5 1.5 0 0 1 3.5 4h4.4l1.6 2h7A1.5 1.5 0 0 1 18 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z';
  const FILE_ICON = 'M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15';

  let config = {};
  try {
    config = JSON.parse(document.getElementById('mcp-app-config').textContent) || {};
  } catch {
    // Unfilled placeholder: the view can still show the result, just not navigate
  }

  const els = {
    crumbs: document.getElementById('crumbs'),
    refresh: document.getElementById('refresh'),
    items: document.getElementById('items'),
    more: document.getElementById('more'),
    status: document.getElementById('status'),
  };

  const state = {
    // Arguments of the tool call the host rendered this view for
    input: undefined,
    // { driveId, id, name } of the folders opened here, outermost first
    crumbs: [],
    items: [],
    nextLink: undefined,
    // The arguments behind the current page; the next page repeats them with skiptoken
    lastArgs: undefined,
    busy: false,
  };

  const bridge = createMcpAppBridge({
    name: 'ms-365-file-browser',
    onToolInput(args) {
      state.input = args;
    },
    onToolResult: showToolResult,
    onToolCancelled() {
      setStatus('The listing was cancelled.', true);
    },
    onReady() {
      if (state.items.length || state.crumbs.length) render();
    },
    onInitError(error) {
      setStatus('Could not connect to the host: ' + error.message, true);
    },
  });

  els.refresh.addEventListener('click', refresh);
  els.more.addEventListener('click', loadMore);

  // A list-folder-style result: { value: [driveItem], @odata.nextLink? }
  function readListing(result) {
    const data = bridge.readToolResult(result, 'The listing failed.');
    if (!isObject(data) || !Array.isArray(data.value)) {
      throw new Error('This result is not a folder listing.');
    }
    return {
      items: data.value.filter(isObject),
      nextLink: str(data['@odata.nextLink']),
    };
  }

  function showToolResult(result) {
    let listing;
    try {
      listing = readListing(result);
    } catch (error) {
      setStatus(error.message, true);
      updateControls();
      return;
    }
    const input = state.input || {};
    const parent = (listing.items[0] && listing.items[0].parentReference) || {};
    const driveId = str(input.driveId) || str(parent.driveId);
    const id = str(input.driveItemId) || str(parent.id);
    state.crumbs = driveId && id ? [{ driveId, id, name: folderName(parent.path, id) }] : [];
    state.lastArgs = state.input ? pageArgs(state.input) : undefined;
    state.items = listing.items;
    state.nextLink = listing.nextLink;
    render();
  }

  // parentReference.path is like /drive/root:/Documents/Reports
  function folderName(path, id) {
    if (typeof path === 'string' && path.includes('root:')) {
      const parts = path
        .slice(path.indexOf('root:') + 5)
        .split('/')
        .filter(Boolean);
      return parts.length ? decode(parts[parts.length - 1]) : 'Root';
    }
    return id === 'root' ? 'Root' : 'Folder';
  }

  function listArgs(driveId, id) {
    const args = { driveId, driveItemId: id, select: SELECT, top: PAGE_SIZE };
    const account = state.input && str(state.input.account);
    if (account) args.account = account;
    return args;
  }

  async function load(args, crumbs, append) {
    if (state.busy || !canCallTools()) return;
    state.busy = true;
    setStatus('Loading...', false);
    updateControls();
    try {
      const result = await bridge.callTool(config.toolName, args);
      const listing = readListing(result);
      state.crumbs = crumbs;
      state.lastArgs = pageArgs(args);
      state.items = append ? state.items.concat(listing.items) : listing.items;
      state.nextLink = listing.nextLink;
      state.busy = false;
      render();
    } catch (error) {
      state.busy = false;
      setStatus(error.message || String(error), true);
      updateControls();
    }
  }

  function openFolder(folder) {
    load(listArgs(folder.driveId, folder.id), state.crumbs.concat([folder]), false);
  }

  function openCrumb(index) {
    const crumb = state.crumbs[index];
    load(listArgs(crumb.driveId, crumb.id), state.crumbs.slice(0, index + 1), false);
  }

  // Lists the folder again with the fields the view needs, keeping the listing's own
  // filter or order
  function refresh() {
    const crumb = current();
    if (!crumb) return;
    const args = pageArgs(state.lastArgs || {});
    delete args.excludeResponse;
    load(Object.assign(args, listArgs(crumb.driveId, crumb.id)), state.crumbs, false);
  }

  function loadMore() {
    const crumb = current();
    const base = state.lastArgs || (crumb && listArgs(crumb.driveId, crumb.id));
    if (!state.nextLink || !base) return;
    load(Object.assign(pageArgs(base), { skiptoken: state.nextLink }), state.crumbs, true);
  }

  async function openLink(url) {
    try {
      const result = await bridge.openLink(url);
      if (result && result.isError) setStatus('The host did not open the link.', true);
    } catch (error) {
      setStatus(error.message || 'The host did not open the link.', true);
    }
  }

  function render() {
    renderCrumbs();
    const folders = state.items.filter(isFolder);
    const files = state.items.filter((item) => !isFolder(item));
    const rows = folders.concat(files).map(renderRow);
    els.items.replaceChildren(...rows);
    els.items.hidden = rows.length === 0;
    setStatus(rows.length === 0 ? 'This folder is empty.' : selectHint(), false);
    updateControls();
  }

  // Models often pick their own select and leave out fields the view needs
  function selectHint() {
    const select = state.lastArgs && state.lastArgs.select;
    if (select === undefined || !canCallTools() || !current()) return '';
    const fields = (Array.isArray(select) ? select : String(select).split(',')).map((field) =>
      String(field).trim().toLowerCase()
    );
    if (NEEDED.every((field) => fields.includes(field.toLowerCase()))) return '';
    return 'This listing leaves out details the browser needs. Refresh to load them.';
  }

  function renderCrumbs() {
    const parts = [];
    state.crumbs.forEach((crumb, index) => {
      if (index > 0) parts.push(span('sep', '/'));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crumb';
      button.textContent = crumb.name;
      if (index === state.crumbs.length - 1) {
        button.disabled = true;
        button.setAttribute('aria-current', 'location');
      } else if (canCallTools()) {
        button.addEventListener('click', () => openCrumb(index));
      } else {
        button.disabled = true;
      }
      parts.push(button);
    });
    els.crumbs.replaceChildren(...parts);
  }

  function renderRow(item) {
    // A shortcut to a folder shared from another drive carries the real item here
    const target = isObject(item.remoteItem) ? item.remoteItem : item;
    const folder = isFolder(item);
    const name = str(item.name) || str(target.name) || '(no name)';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'row';
    button.title = name;
    button.append(icon(folder), span('name', name), span('meta', describe(item, target, folder)));
    const action = rowAction(item, target, folder, name);
    if (action) button.addEventListener('click', action);
    else button.disabled = true;
    const li = document.createElement('li');
    li.append(button);
    return li;
  }

  function rowAction(item, target, folder, name) {
    if (folder && canCallTools()) {
      const parent = isObject(target.parentReference) ? target.parentReference : {};
      // A shortcut's folder is on another drive, so never borrow this one's id for it
      const here = target === item ? current() && current().driveId : undefined;
      const driveId = str(parent.driveId) || here;
      const id = str(target.id);
      if (driveId && id) return () => openFolder({ driveId, id, name });
    }
    const url = httpsUrl(target.webUrl) || httpsUrl(item.webUrl);
    if (url && canOpenLinks()) return () => openLink(url);
    return undefined;
  }

  function describe(item, target, folder) {
    const parts = [];
    if (folder) {
      const count = target.folder.childCount;
      if (typeof count === 'number') parts.push(count === 1 ? '1 item' : count + ' items');
    } else if (typeof target.size === 'number') {
      parts.push(formatSize(target.size));
    }
    const date = formatDate(target.lastModifiedDateTime || item.lastModifiedDateTime);
    if (date) parts.push(date);
    return parts.join(' · ');
  }

  function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return (unit === 0 ? String(value) : value.toFixed(value < 10 ? 1 : 0)) + ' ' + units[unit];
  }

  function formatDate(value) {
    if (typeof value !== 'string') return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(bridge.locale, { dateStyle: 'medium' }).format(date);
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  function icon(folder) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('class', folder ? 'icon folder' : 'icon file');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', folder ? FOLDER_ICON : FILE_ICON);
    svg.append(path);
    return svg;
  }

  function span(className, text) {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  }

  function setStatus(text, isError) {
    els.status.textContent = text;
    els.status.hidden = !text;
    els.status.classList.toggle('error', Boolean(isError));
  }

  function updateControls() {
    els.refresh.disabled = state.busy || !current() || !canCallTools();
    els.more.hidden = !state.nextLink || !canCallTools();
    els.more.disabled = state.busy;
  }

  function current() {
    return state.crumbs[state.crumbs.length - 1];
  }

  function canCallTools() {
    return Boolean(bridge.capabilities.serverTools && config.toolName);
  }

  function canOpenLinks() {
    return Boolean(bridge.capabilities.openLinks);
  }

  function isFolder(item) {
    const target = isObject(item.remoteItem) ? item.remoteItem : item;
    return isObject(target.folder);
  }

  function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function str(value) {
    return typeof value === 'string' && value ? value : undefined;
  }

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  // The arguments a listing repeats for its next page: no cursor, and never every
  // page at once
  function pageArgs(args) {
    const copy = Object.assign({}, args);
    delete copy.skiptoken;
    delete copy.fetchAllPages;
    return copy;
  }

  function httpsUrl(value) {
    if (typeof value !== 'string') return undefined;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : undefined;
    } catch {
      return undefined;
    }
  }
})();
