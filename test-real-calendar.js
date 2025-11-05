#!/usr/bin/env node

// Direct test of the calendar fix using our local build
import GraphClient from './dist/graph-client.js';
import { registerGraphTools } from './dist/graph-tools.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

async function testCalendarFix() {
  console.log('Testing calendar fix with Specific Calendar...\n');

  // Initialize the graph client
  const graphClient = new GraphClient();

  // Check if we're logged in
  try {
    await graphClient.ensureAuthenticated();
    console.log('✓ Authenticated successfully\n');
  } catch (error) {
    console.error('Authentication failed. Please run: npm run dev -- --login');
    process.exit(1);
  }

  // Test parameters
  const exampleCalendarId = 'EXAMPLE_CALENDAR_ID_HERE';

  const testEvent = {
    subject: 'TEST - Calendar Fix Verification',
    body: {
      contentType: 'text',
      content: 'This test verifies that events can be created on the Specific Calendar',
    },
    start: {
      dateTime: '2025-12-20T10:00:00',
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: '2025-12-20T11:00:00',
      timeZone: 'America/New_York',
    },
  };

  // Build the path with our fix
  const path = `/me/calendars/${encodeURIComponent(exampleCalendarId)}/events`;
  console.log('Using path:', path);
  console.log('');

  try {
    // Make the request
    const response = await graphClient.graphRequest(path, {
      method: 'POST',
      body: JSON.stringify(testEvent),
    });

    const result = JSON.parse(response.content[0].text);
    console.log('✓ Event created successfully!');
    console.log('  Event ID:', result.id);
    console.log('  Subject:', result.subject);
    console.log('');

    // Verify it's on the correct calendar by checking the event
    console.log('Verifying calendar placement...');
    const getPath = `/me/events/${result.id}`;
    const verifyResponse = await graphClient.graphRequest(getPath, {
      method: 'GET',
    });

    const event = JSON.parse(verifyResponse.content[0].text);

    // The calendar link should contain the Specific Calendar ID
    if (
      event['calendar@odata.navigationLink'] &&
      event['calendar@odata.navigationLink'].includes(exampleCalendarId)
    ) {
      console.log('✅ SUCCESS! Event was created on the Specific Calendar!');
    } else {
      console.log('❌ Event was created but on the wrong calendar');
      console.log('Calendar link:', event['calendar@odata.navigationLink']);
    }

    // Clean up - delete the test event
    console.log('\nCleaning up test event...');
    await graphClient.graphRequest(`/me/events/${result.id}`, {
      method: 'DELETE',
    });
    console.log('✓ Test event deleted');
  } catch (error) {
    console.error('Error creating event:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }

  process.exit(0);
}

testCalendarFix().catch(console.error);
