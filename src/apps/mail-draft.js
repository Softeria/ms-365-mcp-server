/* global createMcpAppBridge */

(() => {
  'use strict';

  // Long enough for an approval prompt in the host; each progress notification starts it over
  const CALL_TIMEOUT_MS = 10 * 60 * 1000;
  // Bidi controls and marks can make text read in another order than it is sent: one
  // address like another, or the digit groups of an account number swapped
  const BIDI = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

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
    // Whether the draft shown is one the view read itself
    read: false,
    reading: false,
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
      readOnOpen();
    },
    onToolCancelled() {
      state.error = 'Creating the draft was cancelled.';
      render();
    },
    onReady() {
      render();
      readOnOpen();
    },
    onInitError(error) {
      state.error = 'Could not connect to the host: ' + error.message;
      render();
    },
  });

  els.send.addEventListener('click', send);
  els.open.addEventListener('click', openInOutlook);

  // The view shows the draft as it reads it itself, not the result that opened it: a select in
  // the model's call can leave fields out of that, and only a read gets Graph's text of the body
  async function readOnOpen() {
    if (!state.draft || state.read || state.reading || !canRead()) return;
    state.reading = true;
    render();
    try {
      const current = await readDraft();
      if (current.isDraft === false) throw new Error('This draft has already been sent.');
      state.draft = current;
      state.read = true;
    } catch (error) {
      state.error = (error && error.message) || String(error);
    }
    state.reading = false;
    render();
  }

  async function send() {
    if (!canSend()) return;
    state.sending = true;
    state.error = undefined;
    state.notice = undefined;
    render();
    try {
      // The click approves what the user saw, so the draft is read again first. When it
      // changed since (the model edited it, or an old view is shown again), or the view had
      // not read it yet, that version is shown instead and sending takes another click.
      const current = await readDraft();
      if (current.isDraft === false) throw new Error('This draft has already been sent.');
      if (
        !state.read ||
        !str(state.draft.changeKey) ||
        current.changeKey !== state.draft.changeKey
      ) {
        state.notice = state.read
          ? 'The draft changed since it was shown. Check it and press Send again.'
          : 'Here is the whole draft. Check it and press Send again.';
        state.draft = current;
        state.read = true;
      } else if (hasRecipients(current)) {
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

  async function readDraft() {
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
    const openable = Boolean(draft && !state.sent && webLink(draft) && canOpenLinks());
    els.send.hidden = !sendable();
    els.send.disabled = !canSend();
    els.open.hidden = !openable;
    if (state.error) setStatus(state.error, true);
    else if (!draft) setStatus('Loading...', false);
    else if (state.sent) setStatus('Sent.', false);
    else if (state.sending) setStatus('Sending...', false);
    else if (state.reading) setStatus('Reading the draft...', false);
    else if (!sendable()) {
      setStatus(
        openable
          ? 'To send it, open it in Outlook or ask in the chat.'
          : 'Ask in the chat to send it.',
        false
      );
    } else if (!hasRecipients(draft)) setStatus('This draft has no recipients yet.', false);
    else if (state.notice) setStatus(state.notice, false);
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
    // A draft can send the answers to someone else
    const replyTo = recipientsText(draft.replyTo);
    if (replyTo) rows.push(...field('Reply to', replyTo));
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
    const text = str(value) && value.replace(BIDI, '').trim();
    return text || undefined;
  }

  // This server asks Graph for text bodies, so the view's own read has the whole body as text,
  // which in practice writes out link and image addresses. The view never turns HTML into text
  // itself: before its read, or when the server gives HTML (MS365_MCP_BODY_FORMAT=html), it
  // shows only Graph's preview of the first 255 characters.
  function wholeBody(draft) {
    const body = isObject(draft.body) ? draft.body : {};
    return String(body.contentType).toLowerCase() === 'text' && typeof body.content === 'string';
  }

  // Without bidi controls and marks, the body reads in the order it is sent
  function bodyText(draft) {
    const text = wholeBody(draft) ? draft.body.content : str(draft.bodyPreview) || '';
    return text.replace(BIDI, '').trim();
  }

  function webLink(draft) {
    return draft ? httpsUrl(draft.webLink) : undefined;
  }

  // Send needs both tools, and once the view has read the draft, all of its body as text
  function sendable() {
    return Boolean(
      state.draft && !state.sent && canCall() && (!state.read || wholeBody(state.draft))
    );
  }

  // Without recipients a click still reads the draft again: the model may add them later
  function canSend() {
    return sendable() && !state.sending && !state.reading;
  }

  function canRead() {
    return Boolean(bridge.capabilities.serverTools && str(tools.get));
  }

  // Sending needs both: the draft is read again right before it is sent
  function canCall() {
    return canRead() && Boolean(str(tools.send));
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
