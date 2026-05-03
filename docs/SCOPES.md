# OAuth Scopes — Enabi M365 MCP

The Enabi fork requests **8 scopes**. Down from upstream's possible 17 personal + 45 org = 62.

## Scopes requested at login

| Scope | Why we request it | Tools that use it |
|-------|-------------------|-------------------|
| `User.Read` | Identify the signed-in user (email, display name) | `get-current-user` |
| `Mail.ReadWrite` | Read and modify mail in the signed-in user's mailbox. Subsumes `Mail.Read`. | All 32 personal-mailbox mail tools |
| `Mail.Send` | Send mail as the signed-in user, including replies and forwards | `send-mail`, `forward-mail-message`, `reply-mail-message`, `reply-all-mail-message`, `send-draft-message` |
| `Mail.Read.Shared` | **Read shared mailboxes** (e.g. `support@enabi.io`). Read-only — sending from shared mailboxes is intentionally NOT exposed. | `get-shared-mailbox-message`, `list-shared-mailbox-messages`, `list-shared-mailbox-folder-messages` |
| `MailboxSettings.ReadWrite` | Manage mail rules, focused-inbox overrides, signature, time zone. Subsumes `MailboxSettings.Read`. | mail rules, mailbox settings, outlook categories tools |
| `Calendars.ReadWrite` | Read and write the signed-in user's calendars. Subsumes `Calendars.Read`. | All 26 personal-calendar tools |
| `Contacts.ReadWrite` | Read and write personal contacts. Subsumes `Contacts.Read`. | All 5 contact tools |
| `offline_access` | Issue a refresh token so the user does not have to log in again every hour. Injected silently by the server, never advertised in OAuth metadata. | All tools (token refresh) |

## Explicitly NOT requested

The following scopes have been intentionally excluded compared to upstream:

- All `Files.*`, `Sites.*` — OneDrive, SharePoint
- All `Tasks.*` — Planner, ToDo (Notion is Enabi's task home)
- All `Notes.*` — OneNote (Notion)
- All `Chat.*`, `Channel.*`, `Team*`, `ChatMessage.*`, `ChannelMessage.*` — Teams chat/channels
- All `Group.*`, `GroupMember.*`, `Directory.*` — group/directory management
- `User.Read.All`, `People.Read`, `Presence.*` — looking up other users' profiles
- `OnlineMeetings.*`, `OnlineMeetingArtifact.*`, `OnlineMeetingRecording.*`, `OnlineMeetingTranscript.*`, `VirtualEvent.*` — Teams meetings
- `Calendars.Read.Shared` — shared calendars (find-meeting-times, get-schedule)
- `Mail.Send.Shared` — sending from shared mailboxes (intentional read-only on shared)
- `SensitivityLabel.Read`, `Place.*` — sensitivity labels, room booking

## Adding a scope

Adding a scope is a deliberate change. Process:

1. Add the scope to the relevant tool's `scopes` array in `src/endpoints.json`.
2. Add the tool name to `src/enabi-allowlist.ts`.
3. Run `npm run audit:capabilities` and copy the diff into `docs/CAPABILITY_BASELINE.json`.
4. Document the justification in the PR description.
5. Inform the Azure AD admin so the new scope is pre-consented in the tenant.

CI will block any PR that changes scopes without a matching baseline update.
