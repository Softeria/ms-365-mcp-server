#!/usr/bin/env node

// Test script to verify the calendarId parameter fix
// This simulates what the MCP client would do

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
const server = spawn('node', [join(__dirname, 'dist', 'index.js'), '-v'], {
  stdio: ['pipe', 'pipe', 'inherit'],
});

// Wait a bit for server to start
setTimeout(() => {
  // Test the create-calendar-event with calendarId
  const testRequest = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'create-calendar-event',
      arguments: {
        calendarId: 'EXAMPLE_CALENDAR_ID_HERE',
        body: {
          subject: 'Test Event on Specific Calendar',
          body: {
            contentType: 'text',
            content: 'Testing calendarId parameter fix',
          },
          start: {
            dateTime: '2025-12-01T10:00:00.0000000',
            timeZone: 'America/New_York',
          },
          end: {
            dateTime: '2025-12-01T11:00:00.0000000',
            timeZone: 'America/New_York',
          },
        },
      },
    },
    id: 1,
  };

  console.log('Sending test request:', JSON.stringify(testRequest, null, 2));

  server.stdin.write(JSON.stringify(testRequest) + '\n');

  // Read response
  server.stdout.on('data', (data) => {
    console.log('Response:', data.toString());
  });

  // Close after a few seconds
  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 5000);
}, 2000);
