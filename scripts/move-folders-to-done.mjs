/**
 * Batch-move messages from old Inbox subfolders into "Done", then delete empty folders.
 *
 * Uses Graph API $batch endpoint (up to 20 requests per batch) with
 * throttle handling adapted from m365-migration-planner's graph-throttle-handler.
 *
 * Usage: node scripts/move-folders-to-done.mjs [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PublicClientApplication } from "@azure/msal-node";

// ============================================================================
// CONFIG
// ============================================================================

const CLIENT_ID = "40f10cb4-ee0c-44b6-b19f-4a52e95165d9";
const TENANT_ID = "1bcbc3fc-58a5-46c3-a961-4b0a5f51919a";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const BATCH_SIZE = 20; // Graph $batch limit
const MAX_RETRIES = 5;

// Folders to keep as-is (case-insensitive match)
const KEEP_FOLDERS = new Set(
  ["BrightPay", "Github", "Normandy Village School", "Done", "To-Do"].map(
    (f) => f.toLowerCase()
  )
);

const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================================
// AUTH
// ============================================================================

async function getAccessToken() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const cacheFile = path.join(__dirname, "..", ".token-cache.json");
  const raw = JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  const pca = new PublicClientApplication({
    auth: {
      clientId: CLIENT_ID,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    },
  });
  pca.getTokenCache().deserialize(raw.data);
  const accounts = await pca.getTokenCache().getAllAccounts();

  if (!accounts.length) {
    throw new Error("No cached accounts — run the MCP server login first");
  }

  const result = await pca.acquireTokenSilent({
    account: accounts[0],
    scopes: ["https://graph.microsoft.com/Mail.ReadWrite"],
  });
  return result.accessToken;
}

// ============================================================================
// THROTTLE HELPERS (adapted from m365-migration-planner)
// ============================================================================

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt, baseDelayMs) {
  const MAX_DELAY_MS = 5 * 60 * 1000;
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.min(exponential * jitter, MAX_DELAY_MS);
}

// ============================================================================
// GRAPH HELPERS
// ============================================================================

async function graphGet(token, url) {
  const resp = await fetch(`${GRAPH_BASE}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`GET ${url}: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

async function graphGetAll(token, url) {
  const items = [];
  let nextUrl = url;
  while (nextUrl) {
    const fullUrl = nextUrl.startsWith("http")
      ? nextUrl
      : `${GRAPH_BASE}${nextUrl}`;
    const resp = await fetch(fullUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      throw new Error(
        `GET ${nextUrl}: ${resp.status} ${resp.statusText}`
      );
    }
    const data = await resp.json();
    items.push(...(data.value || []));
    nextUrl = data["@odata.nextLink"] || null;
  }
  return items;
}

/**
 * Submit a $batch request with retry on 429 at the batch level.
 * Returns per-request responses (some may individually be 429).
 */
async function submitBatch(token, requests, attempt = 0) {
  const resp = await fetch(`${GRAPH_BASE}/$batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  // Batch-level throttle
  if (resp.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error("Batch throttled too many times, giving up");
    }
    const retryAfter = parseInt(resp.headers.get("Retry-After") || "60", 10);
    const waitMs = calculateBackoff(attempt, retryAfter * 1000);
    console.warn(
      `  Batch-level 429, waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})...`
    );
    await delay(waitMs);
    return submitBatch(token, requests, attempt + 1);
  }

  if (!resp.ok) {
    throw new Error(`$batch: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return data.responses || [];
}

/**
 * Move messages in batches of BATCH_SIZE using $batch endpoint.
 * Retries individual 429 failures.
 */
async function batchMoveMessages(token, messageIds, destinationFolderId) {
  let moved = 0;
  let pending = messageIds.map((id) => ({ messageId: id, attempt: 0 }));

  while (pending.length > 0) {
    // Take up to BATCH_SIZE
    const chunk = pending.splice(0, BATCH_SIZE);

    const requests = chunk.map((item, idx) => ({
      id: String(idx),
      method: "POST",
      url: `/me/messages/${item.messageId}/move`,
      headers: { "Content-Type": "application/json" },
      body: { destinationId: destinationFolderId },
    }));

    if (DRY_RUN) {
      moved += chunk.length;
      continue;
    }

    const responses = await submitBatch(token, requests);

    // Check for individual failures
    const retryItems = [];
    for (const resp of responses) {
      const idx = parseInt(resp.id, 10);
      const item = chunk[idx];
      if (resp.status === 429) {
        if (item.attempt < MAX_RETRIES) {
          item.attempt++;
          retryItems.push(item);
        } else {
          console.error(
            `  Failed to move message ${item.messageId} after ${MAX_RETRIES} retries`
          );
        }
      } else if (resp.status >= 200 && resp.status < 300) {
        moved++;
      } else {
        console.error(
          `  Move failed for message ${item.messageId}: ${resp.status} ${JSON.stringify(resp.body?.error?.message || "")}`
        );
      }
    }

    // Re-queue throttled items with a delay
    if (retryItems.length > 0) {
      const waitMs = calculateBackoff(retryItems[0].attempt, 1000);
      console.warn(
        `  ${retryItems.length} items throttled, retrying in ${Math.round(waitMs / 1000)}s...`
      );
      await delay(waitMs);
      pending.unshift(...retryItems);
    }
  }

  return moved;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE RUN ===");
  console.log();

  const token = await getAccessToken();
  console.log("Authenticated successfully\n");

  // Get all Inbox child folders
  const folders = await graphGetAll(
    token,
    "/me/mailFolders/inbox/childFolders?$select=id,displayName,totalItemCount"
  );

  // Find Done folder
  const doneFolder = folders.find(
    (f) => f.displayName.toLowerCase() === "done"
  );
  if (!doneFolder) {
    throw new Error('Could not find "Done" folder');
  }
  console.log(`Target: Done (${doneFolder.id.slice(0, 20)}...)\n`);

  // Identify folders to move from
  const foldersToMove = folders.filter(
    (f) => !KEEP_FOLDERS.has(f.displayName.toLowerCase())
  );

  if (foldersToMove.length === 0) {
    console.log("No folders to move — all done!");
    return;
  }

  const totalMessages = foldersToMove.reduce(
    (sum, f) => sum + (f.totalItemCount || 0),
    0
  );
  console.log(
    `Moving messages from ${foldersToMove.length} folders (~${totalMessages} messages) into Done:\n`
  );
  for (const f of foldersToMove) {
    console.log(`  ${f.displayName} (${f.totalItemCount} messages)`);
  }
  console.log();

  // Process each folder
  let grandTotal = 0;
  for (const folder of foldersToMove) {
    if (folder.totalItemCount === 0) {
      console.log(`${folder.displayName}: empty, skipping to delete`);
    } else {
      console.log(
        `${folder.displayName}: fetching ${folder.totalItemCount} message IDs...`
      );

      // Fetch all message IDs from this folder
      const messages = await graphGetAll(
        token,
        `/me/mailFolders/${encodeURIComponent(folder.id)}/messages?$select=id&$top=100`
      );

      console.log(`  Found ${messages.length} messages, moving in batches of ${BATCH_SIZE}...`);

      const moved = await batchMoveMessages(
        token,
        messages.map((m) => m.id),
        doneFolder.id
      );

      grandTotal += moved;
      console.log(`  Moved ${moved}/${messages.length} messages`);
    }

    // Delete the now-empty folder
    if (DRY_RUN) {
      console.log(`  Would delete folder "${folder.displayName}"\n`);
    } else {
      const delResp = await fetch(
        `${GRAPH_BASE}/me/mailFolders/${encodeURIComponent(folder.id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (delResp.ok || delResp.status === 204) {
        console.log(`  Deleted folder "${folder.displayName}"\n`);
      } else {
        console.error(
          `  Failed to delete "${folder.displayName}": ${delResp.status} ${delResp.statusText}\n`
        );
      }
    }
  }

  console.log(`\nDone! Moved ${grandTotal} messages total.`);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
