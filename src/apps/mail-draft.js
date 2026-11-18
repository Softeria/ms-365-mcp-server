/* global createMcpAppBridge */

(() => {
  'use strict';

  // Long enough for an approval prompt in the host; each progress notification starts it over
  const CALL_TIMEOUT_MS = 10 * 60 * 1000;
  const ENTITIES = new Map([
    ['amp', '&'],
    ['lt', '<'],
    ['gt', '>'],
    ['quot', '"'],
    ['apos', "'"],
    ['nbsp', ' '],
    ['shy', ''],
    ['ndash', '–'],
    ['mdash', '—'],
    ['lsquo', '‘'],
    ['rsquo', '’'],
    ['ldquo', '“'],
    ['rdquo', '”'],
    ['hellip', '…'],
    ['bull', '•'],
    ['middot', '·'],
    ['laquo', '«'],
    ['raquo', '»'],
    ['copy', '©'],
    ['reg', '®'],
    ['trade', '™'],
    ['euro', '€'],
    ['pound', '£'],
  ]);

  let config = {};
  try {
    config = JSON.parse(document.getElementById('mcp-app-config').textContent) || {};
  } catch {
    // Unfilled placeholder: the view can still show the draft, just not send it
  }
  // Role -> tool name, and only for tools this server has registered
  const tools = isObject(config.tools) ? config.tools : {};

  const els = {
    subject: document.getElementById('subject'),
    fields: document.getElementById('fields'),
    body: document.getElementById('body'),
    send: document.getElementById('send'),
    open: document.getElementById('open'),
    status: document.getElementById('status'),
  };

  const state = {
    // Arguments of the tool call that created the draft
    input: undefined,
    draft: undefined,
    sending: false,
    sent: false,
    error: undefined,
    notice: undefined,
  };

  const bridge = createMcpAppBridge({
    name: 'ms-365-mail-draft',
    onToolInput(args) {
      state.input = args;
    },
    onToolResult(result) {
      try {
        const draft = bridge.readToolResult(result, 'Creating the draft failed.');
        if (!isObject(draft) || !str(draft.id)) {
          throw new Error('The result does not include the draft, so it is not shown here.');
        }
        state.draft = draft;
      } catch (error) {
        state.error = error.message;
      }
      render();
    },
    onToolCancelled() {
      state.error = 'Creating the draft was cancelled.';
      render();
    },
    onReady: render,
    onInitError(error) {
      state.error = 'Could not connect to the host: ' + error.message;
      render();
    },
  });

  els.send.addEventListener('click', send);
  els.open.addEventListener('click', openInOutlook);

  async function send() {
    if (!canSend()) return;
    state.sending = true;
    state.error = undefined;
    state.notice = undefined;
    render();
    try {
      // The click approves what the user saw, so the draft is read again first. When it
      // changed since (the model edited it, or an old view is shown again), the new version
      // is shown instead and sending takes another click.
      const current = await readDraftAgain();
      if (current.isDraft === false) throw new Error('This draft has already been sent.');
      if (!str(state.draft.changeKey) || current.changeKey !== state.draft.changeKey) {
        state.draft = current;
        state.notice = 'The draft changed since it was shown. Check it and press Send again.';
      } else {
        // confirm is the click itself, the user's approval that the confirm gate asks for
        const result = await bridge.callTool(tools.send, mailboxArgs({ confirm: true }), {
          timeout: CALL_TIMEOUT_MS,
        });
        const error = bridge.toolError(result, 'Sending failed.');
        if (error) throw new Error(error);
        state.sent = true;
        tellModel();
      }
    } catch (error) {
      state.error =
        error && error.name === 'TimeoutError'
          ? 'No answer from the host. Check Sent Items before you try again.'
          : (error && error.message) || String(error);
    }
    state.sending = false;
    render();
  }

  async function readDraftAgain() {
    const result = await bridge.callTool(tools.get, mailboxArgs({}), {
      timeout: CALL_TIMEOUT_MS,
    });
    const draft = bridge.readToolResult(result, 'Reading the draft failed.');
    if (!isObject(draft) || draft.id !== state.draft.id) {
      throw new Error('This result is not the draft.');
    }
    return draft;
  }

  // The draft's own id, in the mailbox it was created in: for a reply or forward draft, the
  // input's messageId is the mail it answers
  function mailboxArgs(extra) {
    const input = state.input || {};
    const args = Object.assign({ messageId: state.draft.id }, extra);
    const userId = str(input.userId) || str(input['user-id']);
    if (userId) args.userId = userId;
    const account = str(input.account);
    if (account) args.account = account;
    return args;
  }

  // So the model does not offer to send it again. No subject: a reply's comes from outside.
  function tellModel() {
    if (!bridge.capabilities.updateModelContext) return;
    bridge
      .updateModelContext(
        'The user sent the draft with id ' +
          state.draft.id +
          ' from the mail view. It is in Sent Items now, so it can no longer be sent or changed as a draft.'
      )
      .catch(() => {});
  }

  async function openInOutlook() {
    const url = webLink(state.draft);
    if (!url) return;
    try {
      const result = await bridge.openLink(url);
      if (result && result.isError) throw new Error('The host did not open the link.');
    } catch (error) {
      state.error = error.message || 'The host did not open the link.';
      render();
    }
  }

  function render() {
    const draft = state.draft;
    if (draft) {
      els.subject.textContent = clean(draft.subject) || '(no subject)';
      els.fields.replaceChildren(...fields(draft));
      const body = bodyText(draft);
      els.body.textContent = body;
      els.body.hidden = !body;
    }
    const sendable = Boolean(draft && !state.sent && canCall());
    const openable = Boolean(draft && !state.sent && webLink(draft) && canOpenLinks());
    els.send.hidden = !sendable;
    els.send.disabled = !canSend();
    els.open.hidden = !openable;
    if (state.error) setStatus(state.error, true);
    else if (!draft) setStatus('Loading...', false);
    else if (state.sent) setStatus('Sent.', false);
    else if (state.sending) setStatus('Sending...', false);
    else if (state.notice) setStatus(state.notice, false);
    else if (!sendable) {
      setStatus(
        openable
          ? 'To send it, open it in Outlook or ask in the chat.'
          : 'Ask in the chat to send it.',
        false
      );
    } else if (!hasRecipients(draft)) setStatus('This draft has no recipients yet.', false);
    else setStatus('', false);
  }

  function fields(draft) {
    const rows = [];
    const from = recipientText(draft.from);
    if (from) rows.push(...field('From', from));
    rows.push(...field('To', recipientsText(draft.toRecipients) || 'Nobody yet'));
    const cc = recipientsText(draft.ccRecipients);
    if (cc) rows.push(...field('Cc', cc));
    const bcc = recipientsText(draft.bccRecipients);
    if (bcc) rows.push(...field('Bcc', bcc));
    if (draft.hasAttachments === true) rows.push(...field('Attachments', 'Yes'));
    return rows;
  }

  function field(label, value) {
    return [span('label', label), span('value', value)];
  }

  // Every address is written out: a display name alone can claim to be anyone
  function recipientText(recipient) {
    const email =
      isObject(recipient) && isObject(recipient.emailAddress) ? recipient.emailAddress : {};
    const address = clean(email.address);
    const name = clean(email.name);
    if (!address) return name ? name + ' (no address)' : '';
    return name && name.toLowerCase() !== address.toLowerCase()
      ? name + ' <' + address + '>'
      : address;
  }

  function recipientsText(list) {
    return Array.isArray(list) ? list.map(recipientText).filter(Boolean).join(', ') : '';
  }

  function hasRecipients(draft) {
    return ['toRecipients', 'ccRecipients', 'bccRecipients'].some(
      (key) =>
        Array.isArray(draft[key]) &&
        draft[key].some(
          (r) => isObject(r) && isObject(r.emailAddress) && clean(r.emailAddress.address)
        )
    );
  }

  // Bidi controls can make one address read like another, so they never reach the view
  function clean(value) {
    const text =
      str(value) && value.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim();
    return text || undefined;
  }

  function bodyText(draft) {
    const body = isObject(draft.body) ? draft.body : {};
    const content = typeof body.content === 'string' ? body.content : '';
    const text = String(body.contentType).toLowerCase() === 'html' ? htmlToText(content) : content;
    return text.trim() || (typeof draft.bodyPreview === 'string' ? draft.bodyPreview.trim() : '');
  }

  // Never parsed as HTML: the body comes from the model or from the mail it answers, and
  // a script running in this view could press Send itself. U+E000 and U+E001 mark block
  // edges along the way.
  function htmlToText(html) {
    const text = decodeEntities(
      html
        .replace(/[\uE000\uE001]/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(head|script|style|title)\b[\s\S]*?<\/\1\s*>/gi, '')
        // Source line breaks are spaces in HTML; only tags break lines
        .replace(/\s+/g, ' ')
        .replace(/<br\b[^>]*>/gi, '\n')
        .replace(/<\/t[dh]\s*>/gi, ' ')
        .replace(/<\/p\s*>/gi, '\uE001')
        .replace(/<\/?(p|div|li|tr|h[1-6]|blockquote|table|ul|ol|hr)\b[^>]*>/gi, '\uE000')
        // A tag starts with a letter, / ! or ?: like in a browser, "< 100" is text
        .replace(/<[a-z/!?][^>]*>/gi, '')
        // Adjacent inline elements leave runs of spaces; one keeps the next pattern linear
        .replace(/ {2,}/g, ' ')
        // A run of block edges is one line break (Outlook writes a <div> per line), or a
        // blank line where a paragraph ends
        .replace(/[\uE000\uE001 ]*[\uE000\uE001][\uE000\uE001 ]*/g, (edges) =>
          edges.includes('\uE001') ? '\n\n' : '\n'
        )
    );
    // Split rather than a regex: decoded &nbsp; can bring back long runs of spaces
    return text
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }

  function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code) => {
      if (code[0] === '#') {
        const hex = code[1] === 'x' || code[1] === 'X';
        const point = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
      }
      const named = ENTITIES.get(code.toLowerCase());
      return named === undefined ? match : named;
    });
  }

  function webLink(draft) {
    return draft ? httpsUrl(draft.webLink) : undefined;
  }

  function canSend() {
    return Boolean(
      state.draft && !state.sent && !state.sending && canCall() && hasRecipients(state.draft)
    );
  }

  // Sending needs both: the draft is read again right before it is sent
  function canCall() {
    return Boolean(bridge.capabilities.serverTools && str(tools.get) && str(tools.send));
  }

  function canOpenLinks() {
    return Boolean(bridge.capabilities.openLinks);
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

  function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function str(value) {
    return typeof value === 'string' && value ? value : undefined;
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
