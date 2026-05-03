# Azure AD App Registration

A one-time setup. Daniel does this once for the whole Enabi tenant. The result is a `client_id` and `tenant_id` that every employee uses when installing the MCP.

This takes about 15 minutes. You need to be a Global Administrator (or have someone with that role do the consent step at the end).

## What you are building

A "public client" Azure AD app registration in the Enabi tenant. It represents the Enabi M365 MCP across all employee laptops. It does not store any secrets. Each employee's actual access is their own personal OAuth consent against this app.

## Step 1: Open Entra admin center

Go to https://entra.microsoft.com/. Make sure the top-right account selector shows you are signed in to the Enabi tenant (not your personal account).

## Step 2: Create the app registration

You want **App registrations**, NOT **Enterprise applications**. Two different sections that look similar.

- **Enterprise applications** is for onboarding existing SaaS apps (Salesforce, Slack) for SSO. Wrong place.
- **App registrations** is for apps you build or operate. Right place.

1. In the left nav, click **App registrations** (it is under **Entra ID**, below "Enterprise apps"). Or use this direct link: https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Click **+ New registration** at the top.
3. Fill in:
   - **Name:** `Enabi M365 MCP`
   - **Supported account types:** **Accounts in this organizational directory only (Enabi only - Single tenant)**.
   - **Redirect URI:** select **Public client/native (mobile & desktop)** and enter `http://localhost`. (MSAL's interactive browser auth uses a localhost loopback on an ephemeral port; this entry is what makes that work.)
4. Click **Register**.

You land on the app's overview page. Two things to copy from this page into 1Password right now:

- **Application (client) ID** → save as `MS365_MCP_CLIENT_ID`
- **Directory (tenant) ID** → save as `MS365_MCP_TENANT_ID`

Save them in 1Password under a new entry called **"Enabi M365 MCP — App Registration"**. Anyone installing the MCP needs these two values; neither is a secret, but they are awkward to type so 1Password is the easiest distribution.

## Step 3: Set the app to be a public client

This is the bit that is easy to miss.

1. Left nav of the app: **Authentication**.
2. Scroll to the **Advanced settings** section.
3. **Allow public client flows:** toggle **Yes**.
4. Click **Save** at the top.

Without this, the device-code fallback flow will not work, and some employees on locked-down machines will see weird errors.

## Step 4: Add the API permissions

1. Left nav: **API permissions**.
2. The page already lists `User.Read` (Microsoft Graph, delegated) by default. Leave it.
3. Click **+ Add a permission → Microsoft Graph → Delegated permissions**.
4. Search for and check each of these. They are case-sensitive in the search but the UI normalizes them:

   - `Calendars.ReadWrite`
   - `Contacts.ReadWrite`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `Mail.Read.Shared`
   - `MailboxSettings.ReadWrite`
   - `offline_access`
   - `User.Read` (already there from defaults)

5. Click **Add permissions** at the bottom.

You should now see **8 permissions** listed (all delegated, all Microsoft Graph). The "Admin consent required" column should say **No** for all of them, because these are user-consent scopes by default.

## Step 5: Grant admin consent (the important one)

If you skip this, every employee gets a separate consent prompt with multiple "allow access to your mailbox" lines. Granting tenant-wide consent once means employees just sign in and it works.

1. Still on the **API permissions** page.
2. Click the **Grant admin consent for Enabi** button at the top.
3. Confirm in the popup.
4. Refresh the page. The **Status** column should now show green checkmarks ("Granted for Enabi") on all 8 permissions.

## Step 6: Verify

1. Back to the **Overview** page of the app.
2. Confirm:
   - **Application (client) ID** matches what you saved in 1Password.
   - **Directory (tenant) ID** matches.
   - **Supported account types:** "My organization only".

Optional sanity check: under **Authentication → Platform configurations**, you should see "Mobile and desktop applications" listed with `http://localhost` as a redirect URI.

## Step 7: Tell the team they can install

Post in `#engineering` (or wherever):

> Enabi M365 MCP is ready to install. Run the install script from https://github.com/enabisolutions/mcp-ms365 and use the credentials in 1Password under "Enabi M365 MCP — App Registration". After install ask Claude "what is on my calendar today?" to verify.

## Things that can go wrong

**"Application X is not configured as a multi-tenant application"** — you accidentally picked the wrong account-types option in step 2. Edit it under **Authentication → Supported account types**. We want single-tenant.

**Employee gets "AADSTS500113: No reply address is registered"** — the redirect URI is wrong. Confirm `http://localhost` is in the public client redirect URIs (step 2). Note: it must be `http`, not `https`, and no trailing slash.

**Employee gets "AADSTS65001: User has not consented"** — admin consent was not granted, or only some of the scopes were consented. Re-do step 5.

**A scope is missing in our docs after the fact** — Daniel adds it via PR to `src/endpoints.json` and `docs/CAPABILITY_BASELINE.json`. Then come back here, add the scope to the app registration, click "Grant admin consent" again. Until both are done, employees will get consent prompts.

## Removing employee access (offboarding)

When an employee leaves Enabi:

1. Their Microsoft 365 account is disabled in normal offboarding. That alone makes the MCP stop working on next token refresh (within an hour).
2. To force-revoke immediately: in Entra admin center → **Identity → Users → [the user] → Authentication methods → Sign out** (revokes all sessions and refresh tokens).
3. The MCP on their laptop will get a 401 on the next call and stop working.

You do not need to touch the app registration for offboarding. The app registration represents the MCP as a whole, not any individual user.
